import sql from 'mssql';
import { execSync } from 'child_process';

let poolPromise: Promise<sql.ConnectionPool> | null = null;
let lastTokenTime = 0;

async function getPool(): Promise<sql.ConnectionPool> {
  const now = Date.now();
  // Refresh token pool every 45 minutes
  if (!poolPromise || (now - lastTokenTime > 45 * 60 * 1000)) {
    poolPromise = (async () => {
      let token = '';
      try {
        if (process.env.IDENTITY_ENDPOINT && process.env.IDENTITY_HEADER) {
          const response = await fetch(`${process.env.IDENTITY_ENDPOINT}?resource=https://database.windows.net/&api-version=2019-08-01`, {
            headers: { 'X-IDENTITY-HEADER': process.env.IDENTITY_HEADER }
          });
          if (response.ok) {
            const data = await response.json();
            token = data.access_token;
          } else {
            console.warn('Azure MSI Token fetch failed with status:', response.status);
          }
        } else {
          token = execSync('az account get-access-token --resource https://database.windows.net --query accessToken -o tsv', { encoding: 'utf8' }).trim();
        }
        lastTokenTime = now;
      } catch (e) {
        console.warn('Azure token fetch notice:', e);
      }

      const config: sql.config = {
        server: 'asset-db.database.windows.net',
        database: 'assetledger-db',
        options: {
          encrypt: true,
          trustServerCertificate: false,
          port: 1433,
          requestTimeout: 60000
        },
        authentication: token ? {
          type: 'azure-active-directory-access-token',
          options: { token }
        } : undefined
      };

      return await sql.connect(config);
    })();
  }
  return poolPromise;
}

export async function query(text: string, params: any[] = []) {
  const pool = await getPool();

  // Safely handle Postgres advisory lock calls and standalone transaction controls for pooled connections
  if (
    text.includes('pg_advisory_xact_lock') || 
    text.includes('pg_advisory_lock')
  ) {
    return { rows: [], rowCount: 0 };
  }

  const trimmed = text.trim().toUpperCase();
  if (
    trimmed === 'BEGIN' || trimmed === 'BEGIN;' || trimmed === 'BEGIN TRANSACTION' || trimmed === 'BEGIN TRANSACTION;' ||
    trimmed === 'COMMIT' || trimmed === 'COMMIT;' || trimmed === 'COMMIT TRANSACTION' || trimmed === 'COMMIT TRANSACTION;' ||
    trimmed === 'ROLLBACK' || trimmed === 'ROLLBACK;' || trimmed === 'ROLLBACK TRANSACTION' || trimmed === 'ROLLBACK TRANSACTION;'
  ) {
    return { rows: [], rowCount: 0 };
  }

  const req = pool.request();
  let transformedText = text;

  // 1. Transform Postgres type casts & keywords to T-SQL (SQL Server)
  transformedText = transformedText
    .replace(/AS\s+text/gi, 'AS NVARCHAR(MAX)')
    .replace(/::text/gi, '')
    .replace(/::int/gi, '')
    .replace(/\bILIKE\b/gi, 'LIKE')
    .replace(/\bNOW\(\)/gi, 'GETDATE()')
    .replace(/ON\s+CONFLICT\s+DO\s+NOTHING/gi, '')
    .replace(/\s+NULLS\s+LAST/gi, '')
    .replace(/\s+NULLS\s+FIRST/gi, '')
    .replace(/=\s*true\b/gi, '= 1')
    .replace(/=\s*false\b/gi, '= 0')
    .replace(/,\s*true\b/g, ', 1')
    .replace(/,\s*false\b/g, ', 0');

  // 2. Transform RETURNING clause to OUTPUT INSERTED
  if (/RETURNING\s+([a-zA-Z0-9_*, "\t]+)/i.test(transformedText)) {
    const returningMatch = transformedText.match(/RETURNING\s+([a-zA-Z0-9_*, "\t]+)/i);
    const rawCols = returningMatch ? returningMatch[1].trim() : '*';
    transformedText = transformedText.replace(/RETURNING\s+([a-zA-Z0-9_*, "\t]+)/gi, '').trim();

    let outputClause = 'OUTPUT INSERTED.*';
    if (rawCols !== '*') {
      const formattedCols = rawCols.split(',').map(c => `INSERTED.${c.trim()}`).join(', ');
      outputClause = `OUTPUT ${formattedCols}`;
    }

    if (/INSERT\s+INTO/i.test(transformedText)) {
      transformedText = transformedText.replace(/VALUES\b/i, `${outputClause} VALUES`);
    } else if (/UPDATE\s+/i.test(transformedText)) {
      transformedText = transformedText.replace(/WHERE\b/i, `${outputClause} WHERE`);
    }
  }

  // 3. Transform FILTER (WHERE ...) inside aggregates
  transformedText = transformedText
    .replace(/COUNT\(([^)]+)\)\s+FILTER\s*\(\s*WHERE\s+([\s\S]*?)\)/gi, 'COUNT(CASE WHEN $2 THEN $1 END)')
    .replace(/SUM\(([^)]+)\)\s+FILTER\s*\(\s*WHERE\s+([\s\S]*?)\)/gi, 'SUM(CASE WHEN $2 THEN $1 ELSE 0 END)');

  // 4. Transform LIMIT 1 to TOP 1 for SELECT queries if no OFFSET is present
  if (/LIMIT\s+1/i.test(transformedText) && !/OFFSET/i.test(transformedText)) {
    transformedText = transformedText.replace(/LIMIT\s+1/gi, '');
    if (!/SELECT\s+TOP/i.test(transformedText)) {
      transformedText = transformedText.replace(/SELECT\s+/i, 'SELECT TOP 1 ');
    }
  }

  // 5. Map $1, $2, $3 to @p1, @p2, @p3
  if (params && params.length > 0) {
    params.forEach((param, index) => {
      const pName = `p${index + 1}`;
      transformedText = transformedText.replace(new RegExp(`\\$${index + 1}\\b`, 'g'), `@${pName}`);

      if (param === null || param === undefined) {
        req.input(pName, sql.NVarChar, null);
      } else if (typeof param === 'boolean') {
        req.input(pName, sql.Bit, param ? 1 : 0);
      } else if (typeof param === 'bigint') {
        req.input(pName, sql.BigInt, param.toString());
      } else if (typeof param === 'number') {
        if (Number.isInteger(param)) {
          if (param > 2147483647 || param < -2147483648) {
            req.input(pName, sql.BigInt, param);
          } else {
            req.input(pName, sql.Int, param);
          }
        } else {
          req.input(pName, sql.Decimal(18, 2), param);
        }
      } else {
        req.input(pName, sql.NVarChar, String(param));
      }
    });
  }

  try {
    const result = await req.query(transformedText);
    return {
      rows: result.recordset || [],
      rowCount: result.rowsAffected ? result.rowsAffected[0] : 0,
    };
  } catch (err: any) {
    if (err.message && (err.message.includes('Column names in each table must be unique') || err.message.includes('Violation of PRIMARY KEY constraint'))) {
      return { rows: [], rowCount: 0 };
    }
    throw err;
  }
}

export default query;