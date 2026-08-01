"use client";

import { useMemo, useState } from "react";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";

type StripeCardSetupProps = {
  billingName: string;
  billingEmail: string;
  clientSecret: string;
  onComplete: () => void;
  publishableKey: string;
};

function CardSetupForm({
  billingName,
  billingEmail,
  onComplete,
}: Omit<StripeCardSetupProps, "clientSecret" | "publishableKey">) {
  const stripe = useStripe();
  const elements = useElements();
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function authorizeCard() {
    if (!stripe || !elements || !consent) return;
    setSubmitting(true);
    setErrorMessage("");

    const { error, setupIntent } = await stripe.confirmSetup({
      elements,
      confirmParams: {
        payment_method_data: {
          billing_details: {
            name: billingName,
            email: billingEmail,
          },
        },
        return_url: window.location.href,
      },
      redirect: "if_required",
    });

    if (error) {
      setErrorMessage(error.message ?? "Stripe could not verify this card.");
      setSubmitting(false);
      return;
    }

    if (setupIntent?.status === "succeeded") {
      onComplete();
      return;
    }

    setErrorMessage("Card verification is still processing. Please try again shortly.");
    setSubmitting(false);
  }

  return (
    <div className="stripe-card-panel">
      <div className="stripe-element-shell">
        <PaymentElement options={{ layout: "tabs" }} />
      </div>
      <label className="stripe-consent">
        <input
          type="checkbox"
          checked={consent}
          onChange={(event) => setConsent(event.target.checked)}
        />
        <span>
          I authorize FloorPlanOnline to securely save this payment method and
          charge the final confirmed project amount after scope approval. No
          charge is made when this request is submitted.
        </span>
      </label>
      {errorMessage && <p className="stripe-error">{errorMessage}</p>}
      <button
        className="primary-button"
        type="button"
        disabled={!stripe || !elements || !consent || submitting}
        onClick={authorizeCard}
      >
        {submitting ? "Verifying card…" : "Verify Card & Submit Request"}
      </button>
      <small className="stripe-security-note">
        Card details are entered directly into Stripe and are not stored by
        FloorPlanOnline.
      </small>
    </div>
  );
}

export function StripeCardSetup(props: StripeCardSetupProps) {
  const stripePromise = useMemo(
    () => loadStripe(props.publishableKey),
    [props.publishableKey],
  );

  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret: props.clientSecret,
        appearance: {
          theme: "stripe",
          variables: {
            colorPrimary: "#176baa",
            borderRadius: "12px",
            fontFamily: "Arial, sans-serif",
          },
        },
      }}
    >
      <CardSetupForm
        billingName={props.billingName}
        billingEmail={props.billingEmail}
        onComplete={props.onComplete}
      />
    </Elements>
  );
}
