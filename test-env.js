const path=require('path');
const fs=require('fs');

console.log('Current directory:',__dirname);
console.log('Env file exists:',fs.existsSync(path.resolve(__dirname,'.env')));

require('dotenv').config({path: path.resolve(__dirname,'.env')});

console.log('\nEnvironment Variables:');
console.log('OPENAI_API_KEY exists:',!!process.env.OPENAI_API_KEY);
console.log('OPENAI_API_KEY length:',process.env.OPENAI_API_KEY?.length);
console.log('UPWORK_USERNAME exists:',!!process.env.UPWORK_USERNAME);
console.log('UPWORK_PASSWORD exists:',!!process.env.UPWORK_PASSWORD); 