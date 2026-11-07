"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Mail } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface FaqSectionProps extends React.HTMLAttributes<HTMLElement> {
  title: string;
  description?: string;
  items: {
    question: string;
    answer: string;
  }[];
  contactInfo?: {
    title: string;
    description: string;
    buttonText: string;
    onContact?: () => void;
  };
}

const FaqSection = React.forwardRef<HTMLElement, FaqSectionProps>(
  ({ className, title, description, items, contactInfo, ...props }, ref) => {
    return (
      <section
        ref={ref}
        className={cn(
          "py-14 px-4 w-full bg-[#fff9f2]",
          className
        )}
        {...props}
      >
        <div className="container mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-2xl mx-auto text-center mb-10"
          >
            <h2 className="text-2xl sm:text-4xl font-black mb-2 text-[#0d0d0d] sketch-display">
              {title}
            </h2>
            {description && (
              <p className="text-sm sm:text-base text-[#3a3a3a] sketch-serif">{description}</p>
            )}
          </motion.div>

          {/* FAQ Items */}
          <div className="max-w-2xl mx-auto space-y-3.5">
            {items.map((item, index) => (
              <FaqItem
                key={index}
                question={item.question}
                answer={item.answer}
                index={index}
              />
            ))}
          </div>

          {/* Contact Section */}
          {contactInfo && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="max-w-md mx-auto mt-10 p-6 rounded-2xl border-2 border-[#0d0d0d] bg-white shadow-[4px_4px_0_#0d0d0d] text-center"
            >
              <div className="inline-flex items-center justify-center p-2.5 rounded-full bg-[#ffd23f] border-2 border-[#0d0d0d] shadow-[2px_2px_0_#0d0d0d] text-[#0d0d0d] mb-3">
                <Mail className="h-4 w-4" />
              </div>
              <p className="text-base font-black text-[#0d0d0d] font-mono mb-1">
                {contactInfo.title}
              </p>
              <p className="text-xs text-[#3a3a3a] mb-4">
                {contactInfo.description}
              </p>
              <button
                type="button"
                onClick={contactInfo.onContact}
                className="sketch-btn sketch-btn-solid text-xs cursor-pointer"
              >
                {contactInfo.buttonText}
              </button>
            </motion.div>
          )}
        </div>
      </section>
    );
  }
);
FaqSection.displayName = "FaqSection";

// Internal FaqItem component
const FaqItem = React.forwardRef<
  HTMLDivElement,
  {
    question: string;
    answer: string;
    index: number;
  }
>((props, ref) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const { question, answer, index } = props;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: index * 0.1 }}
      className={cn(
        "group rounded-xl transition-all duration-200 ease-in-out border-2 border-[#0d0d0d]",
        isOpen
          ? "bg-white shadow-[4px_4px_0_#ff6b2c]"
          : "bg-white hover:bg-[#faf7f0] shadow-[3px_3px_0_#0d0d0d]"
      )}
    >
      <Button
        variant="ghost"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-5 py-4 h-auto justify-between hover:bg-transparent cursor-pointer"
      >
        <h3
          className={cn(
            "text-sm sm:text-base font-bold font-mono transition-colors duration-200 text-left text-[#0d0d0d]"
          )}
        >
          {question}
        </h3>
        <motion.div
          animate={{
            rotate: isOpen ? 180 : 0,
            scale: isOpen ? 1.1 : 1,
          }}
          transition={{ duration: 0.2 }}
          className={cn(
            "p-1 rounded-full flex-shrink-0 border-[1.5px] border-[#0d0d0d] transition-colors duration-200",
            isOpen ? "bg-[#ff6b2c] text-white" : "bg-[#ffd23f] text-[#0d0d0d]"
          )}
        >
          <ChevronDown className="h-4 w-4" />
        </motion.div>
      </Button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{
              height: "auto",
              opacity: 1,
              transition: { duration: 0.2, ease: "easeOut" },
            }}
            exit={{
              height: 0,
              opacity: 0,
              transition: { duration: 0.2, ease: "easeIn" },
            }}
          >
            <div className="px-5 pb-4 pt-1 border-t border-dashed border-[#0d0d0d]/20">
              <motion.p
                initial={{ y: -10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -10, opacity: 0 }}
                className="text-xs sm:text-sm text-[#3a3a3a] leading-relaxed pt-2"
              >
                {answer}
              </motion.p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
});
FaqItem.displayName = "FaqItem";

export { FaqSection };
