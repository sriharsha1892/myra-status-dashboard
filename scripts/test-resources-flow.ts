import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface TestResult {
  step: string;
  status: 'PASS' | 'FAIL';
  message: string;
  details?: any;
}

const results: TestResult[] = [];

function logResult(step: string, status: 'PASS' | 'FAIL', message: string, details?: any) {
  results.push({ step, status, message, details });
  const icon = status === 'PASS' ? '✅' : '❌';
  console.log(`${icon} ${step}: ${message}`);
  if (details) {
    console.log(`   Details: ${JSON.stringify(details, null, 2)}`);
  }
}

async function testResourcesFlow() {
  console.log('🧪 Testing Resources/Documents Flow\n');
  console.log('='.repeat(80) + '\n');

  let createdDocId: string | null = null;
  let testUserId: string | null = null;

  try {
    // Step 1: Get a test user
    console.log('📋 Step 1: Finding test user...\n');
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('id, email, role')
      .eq('role', 'admin')
      .limit(1);

    if (userError || !users || users.length === 0) {
      logResult('Find Test User', 'FAIL', 'Could not find admin user', userError);
      return;
    }

    testUserId = users[0].id;
    logResult('Find Test User', 'PASS', `Found admin: ${users[0].email}`);

    // Step 2: Create a document/resource
    console.log('\n📋 Step 2: Creating document...\n');
    const testDocument = {
      title: `Test Document ${Date.now()}`,
      description: 'This is a test document created via automation',
      category: 'documentation',
      file_url: `https://example.com/test-doc-${Date.now()}.pdf`,
      file_type: 'pdf',
      created_by: testUserId,
      is_public: true,
      tags: ['test', 'automation']
    };

    const { data: createdDoc, error: createError } = await supabase
      .from('documents')
      .insert(testDocument)
      .select()
      .single();

    if (createError || !createdDoc) {
      logResult('Create Document', 'FAIL', 'Failed to create document', createError);
      return;
    }

    createdDocId = createdDoc.id;
    logResult('Create Document', 'PASS', `Created document: ${createdDoc.title} (ID: ${createdDocId})`);

    // Step 3: Read the created document
    console.log('\n📋 Step 3: Reading document...\n');
    const { data: readDoc, error: readError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', createdDocId)
      .single();

    if (readError || !readDoc) {
      logResult('Read Document', 'FAIL', 'Failed to read document', readError);
    } else {
      logResult('Read Document', 'PASS', `Successfully read document: ${readDoc.title}`);
    }

    // Step 4: Update document
    console.log('\n📋 Step 4: Updating document...\n');
    const { data: updatedDoc, error: updateError } = await supabase
      .from('documents')
      .update({
        description: 'Updated description via automated test',
        updated_at: new Date().toISOString()
      })
      .eq('id', createdDocId)
      .select()
      .single();

    if (updateError || !updatedDoc) {
      logResult('Update Document', 'FAIL', 'Failed to update document', updateError);
    } else {
      logResult('Update Document', 'PASS', `Updated document description`);
    }

    // Step 5: Test filtering by category
    console.log('\n📋 Step 5: Testing filter by category...\n');
    const { data: docsByCategory, error: categoryError } = await supabase
      .from('documents')
      .select('*')
      .eq('category', 'documentation')
      .limit(10);

    if (categoryError) {
      logResult('Filter by Category', 'FAIL', 'Failed to filter by category', categoryError);
    } else {
      logResult('Filter by Category', 'PASS', `Found ${docsByCategory?.length || 0} documentation items`);
    }

    // Step 6: Test filtering by file type
    console.log('\n📋 Step 6: Testing filter by file type...\n');
    const { data: pdfDocs, error: typeError } = await supabase
      .from('documents')
      .select('*')
      .eq('file_type', 'pdf')
      .limit(10);

    if (typeError) {
      logResult('Filter by File Type', 'FAIL', 'Failed to filter by file type', typeError);
    } else {
      logResult('Filter by File Type', 'PASS', `Found ${pdfDocs?.length || 0} PDF documents`);
    }

    // Step 7: Test public vs private filtering
    console.log('\n📋 Step 7: Testing public/private filter...\n');
    const { data: publicDocs, error: publicError } = await supabase
      .from('documents')
      .select('*')
      .eq('is_public', true)
      .limit(10);

    if (publicError) {
      logResult('Filter Public Docs', 'FAIL', 'Failed to filter public documents', publicError);
    } else {
      logResult('Filter Public Docs', 'PASS', `Found ${publicDocs?.length || 0} public documents`);
    }

    // Step 8: Test search by title
    console.log('\n📋 Step 8: Testing search by title...\n');
    const { data: searchResults, error: searchError } = await supabase
      .from('documents')
      .select('*')
      .ilike('title', '%Test%')
      .limit(10);

    if (searchError) {
      logResult('Search Documents', 'FAIL', 'Failed to search documents', searchError);
    } else {
      logResult('Search Documents', 'PASS', `Found ${searchResults?.length || 0} documents matching "Test"`);
    }

    // Step 9: Test ordering (most recent first)
    console.log('\n📋 Step 9: Testing ordering...\n');
    const { data: recentDocs, error: orderError } = await supabase
      .from('documents')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    if (orderError) {
      logResult('Order Documents', 'FAIL', 'Failed to order documents', orderError);
    } else {
      logResult('Order Documents', 'PASS', `Retrieved ${recentDocs?.length || 0} most recent documents`);
    }

    // Step 10: Clean up - Delete test data
    console.log('\n📋 Step 10: Cleaning up test data...\n');

    if (createdDocId) {
      const { error: deleteError } = await supabase
        .from('documents')
        .delete()
        .eq('id', createdDocId);

      if (deleteError) {
        logResult('Cleanup', 'FAIL', 'Failed to delete test document', deleteError);
      } else {
        logResult('Cleanup', 'PASS', 'Successfully cleaned up test data');
      }
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    logResult('Unexpected Error', 'FAIL', 'Test failed with unexpected error', error);
  }

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('\n📊 TEST SUMMARY\n');
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const total = results.length;

  console.log(`Total Tests: ${total}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%\n`);

  if (failed === 0) {
    console.log('🎉 All resource/document tests passed!\n');
  } else {
    console.log('⚠️  Some tests failed. Review the details above.\n');
  }

  console.log('='.repeat(80) + '\n');
}

testResourcesFlow().catch(console.error);
