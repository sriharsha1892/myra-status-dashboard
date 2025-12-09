import AtRiskDashboard from '@/components/trial/AtRiskDashboard';

export const metadata = {
  title: 'At-Risk Organizations | Trial Management',
  description: 'Monitor and manage at-risk trial organizations',
};

export default function AtRiskPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <AtRiskDashboard />
    </div>
  );
}
