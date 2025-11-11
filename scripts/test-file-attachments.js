// Test file attachment upload for customer support
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

async function testFileAttachments() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Missing Supabase credentials');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  console.log('🧪 Testing File Attachment Upload\n');
  console.log('='.repeat(50));

  let testsPassed = 0;
  let testsFailed = 0;

  // Test 1: Create test file and upload to storage
  console.log('\n📎 Test 1: Upload test file to Supabase storage');
  let testFileUrl = null;
  let testFileName = null;

  try {
    // Create a simple test text file
    const testContent = 'This is a test attachment for customer support ticket.\nGenerated at: ' + new Date().toISOString();
    const fileName = `test-${Date.now()}.txt`;
    const filePath = `support-attachments/${fileName}`;

    // Upload to storage
    const { data, error } = await supabase.storage
      .from('public')
      .upload(filePath, Buffer.from(testContent), {
        contentType: 'text/plain'
      });

    if (error) throw error;

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('public')
      .getPublicUrl(filePath);

    testFileUrl = publicUrl;
    testFileName = fileName;

    console.log('   ✅ File uploaded successfully');
    console.log(`   📄 File: ${fileName}`);
    console.log(`   🔗 URL: ${publicUrl}`);
    testsPassed++;
  } catch (error) {
    console.log('   ❌ Upload failed:', error.message);
    testsFailed++;
  }

  // Test 2: Submit ticket with attachment via API
  console.log('\n📝 Test 2: Submit ticket with attachment');
  let ticketId = null;

  if (testFileUrl) {
    try {
      const response = await fetch('http://localhost:3000/api/customer-support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Test User',
          email: `test.attachment.${Date.now()}@example.com`,
          message: 'Test message with file attachment',
          attachments: [{
            name: testFileName,
            url: testFileUrl,
            type: 'text/plain',
            size: 100
          }]
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        console.log('   ✅ Ticket created with attachment');
        console.log(`   📋 Ticket Number: ${data.ticketNumber}`);
        ticketId = data.ticketId;
        testsPassed++;
      } else {
        throw new Error(data.error || 'Failed to create ticket');
      }
    } catch (error) {
      console.log('   ❌ Ticket creation failed:', error.message);
      testsFailed++;
    }
  } else {
    console.log('   ⏭️  Skipped (file upload failed)');
  }

  // Test 3: Verify ticket contains attachment in description
  console.log('\n🔍 Test 3: Verify attachment in ticket description');

  if (ticketId) {
    try {
      const { data: ticket, error } = await supabase
        .from('tickets')
        .select('description')
        .eq('ticket_id', ticketId)
        .single();

      if (error) throw error;

      if (ticket.description.includes(testFileUrl)) {
        console.log('   ✅ Attachment URL found in ticket description');
        console.log('   📎 Attachment section included');
        testsPassed++;
      } else {
        console.log('   ❌ Attachment URL not found in description');
        testsFailed++;
      }
    } catch (error) {
      console.log('   ❌ Verification failed:', error.message);
      testsFailed++;
    }
  } else {
    console.log('   ⏭️  Skipped (ticket creation failed)');
  }

  // Test 4: Test image attachment (mock)
  console.log('\n🖼️  Test 4: Verify image attachment handling');

  try {
    // Create a minimal PNG file (1x1 transparent pixel)
    const pngBuffer = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
      0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
      0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4,
      0x89, 0x00, 0x00, 0x00, 0x0A, 0x49, 0x44, 0x41,
      0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00,
      0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00,
      0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE,
      0x42, 0x60, 0x82
    ]);

    const imageFileName = `test-image-${Date.now()}.png`;
    const imageFilePath = `support-attachments/${imageFileName}`;

    const { data, error } = await supabase.storage
      .from('public')
      .upload(imageFilePath, pngBuffer, {
        contentType: 'image/png'
      });

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from('public')
      .getPublicUrl(imageFilePath);

    console.log('   ✅ Image uploaded successfully');
    console.log(`   🖼️  Image: ${imageFileName}`);
    console.log(`   🔗 URL: ${publicUrl}`);
    testsPassed++;
  } catch (error) {
    console.log('   ❌ Image upload failed:', error.message);
    testsFailed++;
  }

  // Test 5: Verify storage bucket exists
  console.log('\n📦 Test 5: Verify storage bucket configuration');

  try {
    const { data: buckets, error } = await supabase.storage.listBuckets();

    if (error) throw error;

    const publicBucket = buckets.find(b => b.name === 'public');

    if (publicBucket) {
      console.log('   ✅ Public storage bucket exists');
      console.log(`   📊 Bucket: ${publicBucket.name}`);
      console.log(`   🔓 Public: ${publicBucket.public}`);
      testsPassed++;
    } else {
      console.log('   ❌ Public bucket not found');
      testsFailed++;
    }
  } catch (error) {
    console.log('   ❌ Bucket check failed:', error.message);
    testsFailed++;
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(50));
  console.log(`✅ Passed: ${testsPassed}`);
  console.log(`❌ Failed: ${testsFailed}`);
  console.log(`📈 Total: ${testsPassed + testsFailed}`);
  console.log(`🎯 Success Rate: ${Math.round((testsPassed / (testsPassed + testsFailed)) * 100)}%`);

  if (testsFailed === 0) {
    console.log('\n🎉 All file attachment tests passed!');
    console.log('\n📝 File attachments are working correctly:');
    console.log('   ✓ File upload to Supabase storage');
    console.log('   ✓ Ticket creation with attachments');
    console.log('   ✓ Attachments embedded in ticket description');
    console.log('   ✓ Image file support');
    console.log('   ✓ Storage bucket properly configured');
  } else {
    console.log('\n⚠️  Some tests failed. Please review the errors above.');
    process.exit(1);
  }
}

// Run tests
console.log('Starting file attachment tests in 2 seconds...');
setTimeout(() => {
  testFileAttachments().catch(error => {
    console.error('\n💥 Test suite crashed:', error);
    process.exit(1);
  });
}, 2000);
