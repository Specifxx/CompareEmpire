"use client";

// Opens the price-drop alert modal deliberately (vs the one-time auto-prompt when
// a card is first hearted). Lives on the wishlist page header.
export function PriceAlertButton() {
  return (
    <button
      onClick={() => window.dispatchEvent(new CustomEvent("price-alert-open"))}
      className="btn-primary shrink-0"
    >
      🔔 Price-drop alerts
    </button>
  );
}
