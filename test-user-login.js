import authService from './src/services/authService.js';

// Test user login credentials
async function testUserLogin() {
  console.log('🔐 Testing User Login Credentials...');
  console.log('=====================================');

  const testUsers = [
    { email: 'admin@university.edu', password: 'admin123', role: 'admin' },
    { email: 'faculty@university.edu', password: 'faculty123', role: 'faculty' },
    { email: 'dean@university.edu', password: 'dean123', role: 'dean' },
    { email: 'staff@university.edu', password: 'staff123', role: 'staff' },
    { email: 'chair@university.edu', password: 'chair123', role: 'program_chair' }
  ];

  for (const user of testUsers) {
    try {
      console.log(`\n🔍 Testing login for: ${user.email}`);
      const result = await authService.login(user.email, user.password);
      
      if (result.success) {
        console.log(`✅ Login successful for ${user.role}`);
        console.log(`   User ID: ${result.user.user_id}`);
        console.log(`   Name: ${result.user.name}`);
        console.log(`   Role: ${result.user.role}`);
        console.log(`   Profile Type: ${result.user.profile_type}`);
      } else {
        console.log(`❌ Login failed: ${result.error}`);
      }
    } catch (error) {
      console.log(`❌ Error testing ${user.email}: ${error.message}`);
    }
  }

  // Test invalid credentials
  console.log('\n🔍 Testing invalid credentials...');
  try {
    const result = await authService.login('admin@university.edu', 'wrongpassword');
    if (!result.success) {
      console.log('✅ Invalid password correctly rejected');
    } else {
      console.log('❌ Invalid password was accepted (security issue!)');
    }
  } catch (error) {
    console.log(`❌ Error testing invalid password: ${error.message}`);
  }

  // Test non-existent user
  console.log('\n🔍 Testing non-existent user...');
  try {
    const result = await authService.login('nonexistent@university.edu', 'password123');
    if (!result.success) {
      console.log('✅ Non-existent user correctly rejected');
    } else {
      console.log('❌ Non-existent user was accepted (security issue!)');
    }
  } catch (error) {
    console.log(`❌ Error testing non-existent user: ${error.message}`);
  }

  console.log('\n🎉 User login tests completed!');
}

// Run the tests
testUserLogin().catch(console.error);
