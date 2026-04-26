const sponsors = [
  {
    id: '47af39e0-5b2c-440c-9e60-24c3e69f5134',
    company_name: 'Test Sponsor Corp',
    industry: 'Technology',
    funding_cap_cents: 1000000,
    funding_used_cents: 0,
    status: 'active'
  }
];

const FUNDING_RANGES = [
  { label: 'Any', min: 0, max: Infinity },
  { label: 'Under $1k', min: 0, max: 100_000 },
  { label: '$1k – $5k', min: 100_000, max: 500_000 },
  { label: '$5k+', min: 500_000, max: Infinity },
];

const query = '';
const industry = 'all';
const fundingRange = 0;
const { min, max } = FUNDING_RANGES[fundingRange];

const results = sponsors.filter(s => {
  const q = query.trim().toLowerCase()
  const remaining = s.funding_cap_cents - s.funding_used_cents
  return (
    s.status === 'active' &&
    remaining > 0 &&
    (!q || s.company_name.toLowerCase().includes(q)) &&
    (industry === 'all' || s.industry === industry) &&
    remaining >= min && remaining < max
  )
})

console.log(results);
