// The server's message when it answered; otherwise say the server couldn't be reached,
// so a dropped venue Wi-Fi isn't mistaken for a bad ticket.
export function apiErrorMessage(err, fallback) {
  if (!err?.response) return 'Could not reach the server. Check the Wi-Fi, then check the list before retrying.';
  return err.response.data?.message || fallback;
}
