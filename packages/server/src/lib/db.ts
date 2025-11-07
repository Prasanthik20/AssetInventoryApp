import sql from 'mssql';

const config = {
     server: '(localdb)\\MSSQLLocalDB', // Use double backslash to escape
    database: 'AssetInventoryDB',
    options: {
        encrypt: false,
        trustServerCertificate: true,
        // This tells the driver to use the Windows Authentication provided by the OS
        trustedConnection: true, 
    
    }
};

// This function will connect only once and then reuse the connection pool
async function getPool() {
  try {
    const pool = await sql.connect(config);
    console.log('Database connected successfully!'); // Add a success message
    return pool;
  } catch (err) {
    console.error('Database Connection Failed!', err);
    throw err;
  }
}

export const poolPromise = getPool();