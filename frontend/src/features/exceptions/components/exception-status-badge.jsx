export default function ExceptionStatusBadge({ status }) {
  return <span className={`badge badge-${status}`}>{status}</span>;
}
