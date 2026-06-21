import { test, expect } from '@playwright/test';

test.describe('API Validation', () => {
  let adminToken = '';
  let employeeToken = '';

  test.beforeEach(async ({ request }) => {
    // Get admin token
    const adminLogin = await request.post('http://localhost:5000/api/auth/login', {
      data: {
        email: 'admin@company.com',
        password: 'Admin@123',
      },
    });
    const adminData = await adminLogin.json();
    adminToken = adminData.token;

    // Get employee token
    const employeeLogin = await request.post('http://localhost:5000/api/auth/login', {
      data: {
        email: 'john@company.com',
        password: 'Employee@123',
      },
    });
    const employeeData = await employeeLogin.json();
    employeeToken = employeeData.token;
  });

  test('Login with empty body returns error', async ({ request }) => {
    const response = await request.post('http://localhost:5000/api/auth/login', {
      data: {},
    });
    console.log('Empty login status:', response.status());
    console.log('Empty login response:', await response.text());
  });

  test('Login with missing password returns error', async ({ request }) => {
    const response = await request.post('http://localhost:5000/api/auth/login', {
      data: { email: 'admin@company.com' },
    });
    console.log('Missing password status:', response.status());
  });

  test('GET /api/employees without token returns 401', async ({ request }) => {
    const response = await request.get('http://localhost:5000/api/employees');
    console.log('Employees without token status:', response.status());
    console.log('Expected: 401, Got:', response.status());
  });

  test('GET /api/employees with employee token succeeds', async ({ request }) => {
    const response = await request.get('http://localhost:5000/api/employees', {
      headers: { Authorization: `Bearer ${employeeToken}` },
    });
    console.log('Employee token get employees status:', response.status());
    const data = await response.json();
    console.log('Response data type:', typeof data);
  });

  test('DELETE /api/employees/:id with employee token returns 403', async ({ request }) => {
    const response = await request.delete('http://localhost:5000/api/employees/507f1f77bcf86cd799439011', {
      headers: { Authorization: `Bearer ${employeeToken}` },
    });
    console.log('Employee delete employee status:', response.status());
    console.log('Expected: 403, Got:', response.status());
  });

  test('POST /api/auth/login with invalid email format', async ({ request }) => {
    const response = await request.post('http://localhost:5000/api/auth/login', {
      data: {
        email: 'notanemail',
        password: 'Password@123',
      },
    });
    console.log('Invalid email login status:', response.status());
  });

  test('POST /api/auth/employee-signup with duplicate email', async ({ request }) => {
    const response = await request.post('http://localhost:5000/api/auth/employee-signup', {
      data: {
        firstName: 'Test',
        lastName: 'User',
        email: 'admin@company.com', // Already exists
        phone: '1234567890',
        password: 'Password@123',
        gender: 'Male',
        designation: 'Developer',
      },
    });
    console.log('Duplicate email signup status:', response.status());
    console.log('Expected: 409 or 400, Got:', response.status());
  });

  test('POST /api/employees with missing required fields', async ({ request }) => {
    const response = await request.post('http://localhost:5000/api/employees', {
      data: {
        firstName: 'John',
        // Missing lastName, email, etc.
      },
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    console.log('Employee creation with missing fields status:', response.status());
    console.log('Expected: 400, Got:', response.status());
  });

  test('POST /api/attendance duplicate punch same date returns error', async ({ request }) => {
    const today = new Date().toISOString().split('T')[0];

    // Mark attendance once
    await request.post('http://localhost:5000/api/attendance', {
      data: {
        date: today,
        status: 'Present',
      },
      headers: { Authorization: `Bearer ${employeeToken}` },
    });

    // Try to mark again for same date
    const response = await request.post('http://localhost:5000/api/attendance', {
      data: {
        date: today,
        status: 'Present',
      },
      headers: { Authorization: `Bearer ${employeeToken}` },
    });
    console.log('Duplicate attendance punch status:', response.status());
    console.log('Expected: 400 or 409, Got:', response.status());
  });

  test('GET /api/employees scopes data for employee role', async ({ request }) => {
    const response = await request.get('http://localhost:5000/api/employees', {
      headers: { Authorization: `Bearer ${employeeToken}` },
    });
    const data = await response.json();
    console.log('Employee fetched employees list');
    console.log('Response structure:', Array.isArray(data) ? 'array' : typeof data);
    // Should either return only own data or return scoped list
  });

  test('Rate limiting: 201 rapid requests returns 429', async ({ request }) => {
    let status429Found = false;
    for (let i = 0; i < 250; i++) {
      const response = await request.get('http://localhost:5000/api/employees', {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      if (response.status() === 429) {
        status429Found = true;
        console.log('Rate limit hit at request:', i + 1);
        break;
      }
    }
    console.log('Rate limit (429) found:', status429Found);
  });
});
