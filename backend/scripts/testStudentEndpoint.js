const fetch = require('node-fetch');

async function testStudentInfo() {
  try {
    // Test with SE190001
    const res = await fetch('http://localhost:8080/api/thongbao/students/SE190001', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include'
    });
    
    console.log('Status:', res.status);
    const data = await res.json();
    console.log('Response:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error:', err);
  }
}

testStudentInfo();
