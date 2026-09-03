import LocationStatusList from '../../components/ca/LocationStatusList.jsx';

export default function CaHistory() {
  return (
    <LocationStatusList
      title="History"
      subtitle="Completed and fully paid audits."
      status="history"
      priority="history"
      emptyIcon="history"
      emptyTitle="No completed audits yet"
      emptyMessage="Once a location's bill is fully paid, it lands here."
    />
  );
}
