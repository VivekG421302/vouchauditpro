import LocationStatusList from '../../components/ca/LocationStatusList.jsx';

export default function CaPayments() {
  return (
    <LocationStatusList
      title="Payments"
      subtitle="Bills for completed audits, ready to settle."
      status="payment"
      priority="payment"
      emptyIcon="wallet"
      emptyTitle="No bills pending"
      emptyMessage="Locations land here once you mark their audit complete from the Monitor view."
    />
  );
}
