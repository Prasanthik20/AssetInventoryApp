fetch('http://localhost:3000/api/test-db2')
  .then(res => res.json())
  .then(console.log)
  .catch(console.error);
