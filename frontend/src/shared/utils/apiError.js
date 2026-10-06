// The server's message when it answered; otherwise say plainly that the request never arrived,
// so a dropped venue Wi-Fi isn't mistaken for a bad ticket.
export function apiErrorMessage(err, fallback) {
  if (!err?.response) return 'No connection: nothing was saved. Check the Wi-Fi and try again.';
  return err.response.data?.message || fallback;
}
