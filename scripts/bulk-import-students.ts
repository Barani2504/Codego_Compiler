const students = [
  { regNumber: '21CS001', name: 'Arun Kumar',    department: 'CS', year: 3 },
  { regNumber: '21CS002', name: 'Priya Sharma',  department: 'CS', year: 3 },
  { regNumber: '21IT001', name: 'Rahul Singh',   department: 'IT', year: 3 },
];

async function importStudents() {
  const response = await fetch('http://localhost:3000/api/users/bulk-import', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.ADMIN_JWT_TOKEN || ''}`,
    },
    body: JSON.stringify({
      students,
      defaultPassword: 'College@2024',
    }),
  });

  const result = await response.json();
  console.log(`Imported: ${result.imported}`);
  console.log(`Skipped: ${result.skipped}`);
  if (result.errors?.length > 0) console.log('Errors:', result.errors);
}

importStudents();
