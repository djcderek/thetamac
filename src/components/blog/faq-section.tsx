"use client";

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQSectionProps {
  items: FAQItem[];
}

export function FAQSection({ items }: FAQSectionProps) {
  return (
    <div className="space-y-6">
      {items.map((item) => (
        <div key={item.question}>
          <h3 className="text-lg font-semibold text-foreground">{item.question}</h3>
          <div className="text-muted-foreground mt-2">{item.answer}</div>
        </div>
      ))}
    </div>
  );
}

