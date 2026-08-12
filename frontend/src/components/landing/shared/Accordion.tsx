import type { ReactNode } from "react"
import { Accordion as AccordionPrimitive } from "radix-ui"
import { ChevronDown } from "lucide-react"

export interface AccordionItemData {
  id: string
  question: string
  answer: ReactNode
}

/** FAQ-style expand/collapse list. `type="single" collapsible` — only one item open at a time, and the open one can be closed again. */
export function InfoAccordion({ items }: { items: AccordionItemData[] }) {
  return (
    <AccordionPrimitive.Root type="single" collapsible className="flex flex-col gap-3">
      {items.map((item) => (
        <AccordionPrimitive.Item key={item.id} value={item.id} className="landing-card overflow-hidden rounded-(--landing-radius-md)">
          <AccordionPrimitive.Header>
            <AccordionPrimitive.Trigger className="group flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-sm font-bold text-(--landing-text-primary) outline-none focus-visible:ring-2 focus-visible:ring-(--landing-gold) sm:text-base">
              {item.question}
              <ChevronDown
                className="size-5 shrink-0 text-(--landing-gold-text) transition-transform duration-200 group-data-[state=open]:rotate-180"
                aria-hidden="true"
              />
            </AccordionPrimitive.Trigger>
          </AccordionPrimitive.Header>
          <AccordionPrimitive.Content className="overflow-hidden px-5 text-sm text-(--landing-text-secondary) data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down sm:text-base">
            <div className="pt-1 pb-4">{item.answer}</div>
          </AccordionPrimitive.Content>
        </AccordionPrimitive.Item>
      ))}
    </AccordionPrimitive.Root>
  )
}
