import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata = { title: "Support — Travel Platform" };

const FAQS = [
  {
    question: "How do I update my profile information?",
    answer:
      "Go to Personal information in the account menu, make your changes, and select Save changes.",
  },
  {
    question: "How do I change my password?",
    answer:
      "This is coming soon — it will live under Security settings.",
  },
  {
    question: "Where can I see my bookings and trips?",
    answer:
      "Those sections are being built next and will appear under My trips and Booking orders.",
  },
];

export default function SupportPage() {
  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Support</CardTitle>
          <CardDescription>
            Common questions, and how to reach us if you need help.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {FAQS.map((faq) => (
            <div key={faq.question}>
              <p className="font-medium">{faq.question}</p>
              <p className="text-sm text-muted-foreground">{faq.answer}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contact us</CardTitle>
          <CardDescription>
            Can&apos;t find what you&apos;re looking for?
          </CardDescription>
        </CardHeader>
        <CardContent>
          <a
            href="mailto:support@travel-platform.example"
            className="text-sm font-medium text-primary underline"
          >
            support@travel-platform.example
          </a>
        </CardContent>
      </Card>
    </div>
  );
}
