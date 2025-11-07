import Cors from 'cors';
import { NextApiRequest, NextApiResponse } from 'next';

// Initialize the cors middleware
const cors = Cors({
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // Allowed methods
  // You can also specify allowed origins, but for local dev, this is fine
});

// Helper function to run the middleware
function runMiddleware(req: NextApiRequest, res: NextApiResponse, fn: Function) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result: any) => {
      if (result instanceof Error) {
        return reject(result);
      }
      return resolve(result);
    });
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse, next: Function) {
  await runMiddleware(req, res, cors);
  return next();
}