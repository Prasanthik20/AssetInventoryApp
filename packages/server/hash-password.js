const bcrypt = require('bcrypt');

// The password you want to hash. You will use THIS password to log in.
const plainTextPassword = 'admin123';

// The cost factor for the hash. 10 is a good default.
const saltRounds = 10;

async function generateHash() {
  try {
    console.log(`Generating hash for password: "${plainTextPassword}"`);
    const hashedPassword = await bcrypt.hash(plainTextPassword, saltRounds);

    console.log("\n--- HASH GENERATED SUCCESSFULLY ---");
    console.log("Copy the entire line below and paste it into your SQL script:\n");
    console.log(hashedPassword);
    console.log("\n---------------------------------");
  } catch (error) {
    console.error("Error generating hash:", error);
  }
}

generateHash();