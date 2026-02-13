
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
    console.log('\nChecking users and their tenant_id...');
    const { data: profiles, error: pError } = await supabase
        .from('profiles')
        .select('id, email, tenant_id, role');

    if (pError) {
        console.error('Error fetching profiles:', pError.message);
    } else {
        // Mask IDs for brevity but show enough to compare
        console.table(profiles.map(p => ({
            ...p,
            id: p.id.substring(0, 8) + '...',
            tenant_id: p.tenant_id ? p.tenant_id.substring(0, 8) + '...' : 'NULL'
        })));
    }

    console.log('\nChecking organization count...');
    const { data: orgs, error: oError } = await supabase
        .from('organizations')
        .select('id, name');

    if (oError) {
        console.error('Error fetching organizations:', oError.message);
    } else {
        console.log(`Total organizations: ${orgs.length}`);
        console.table(orgs.map(o => ({
            ...o,
            id: o.id.substring(0, 8) + '...'
        })));
    }

    console.log('\nChecking contacts count per tenant...');
    const { data: contactCounts, error: cError } = await supabase
        .from('contacts')
        .select('tenant_id');

    if (cError) {
        console.error('Error fetching contacts:', cError.message);
    } else {
        const counts = contactCounts.reduce((acc, c) => {
            acc[c.tenant_id] = (acc[c.tenant_id] || 0) + 1;
            return acc;
        }, {});
        console.log('Contact counts per tenant:', counts);
    }
}

checkData();
