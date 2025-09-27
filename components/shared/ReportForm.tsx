// components/shared/ReportForm.tsx

"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FileUploader } from "./FileUploader";
import { useState } from "react";
import { useUploadThing } from "@/lib/uploadthing";
import { IEvent } from "@/lib/models/event.model";
import { useToast } from "@/hooks/use-toast";
import { generatePdfObject } from "@/lib/actions/report.action";
import jsPDF from "jspdf";

const formSchema = z.object({
  preparedBy: z.string().min(3, "This field is required."),
  eventPurpose: z.string().min(3, "This field is required."),
  keyHighlights: z.string().min(3, "This field is required."),
  majorOutcomes: z.string().min(3, "This field is required."),
  objective: z.string().min(3, "This field is required."),
  targetAudience: z.string().min(3, "This field is required."),
  eventGoals: z.string().min(3, "This field is required."),
  agenda: z.string().min(3, "This field is required."),
  partners: z.string().optional(),
  budgetAllocation: z.string().min(3, "This field is required."),
  vips: z.string().optional(),
  keySessions: z.string().optional(),
  photos: z.string().optional(),
  budget: z.string().min(1, "Enter the budget."),
  sponsorship: z.string().optional(),
  actualExpenditure: z.string().min(1, "Enter the actual expenditure."),
});

type ReportFormProps = {
  eventId: string;
  userId: string;
  event: IEvent;
};

// Define the structure for the AI's JSON response
interface PdfSection {
  heading: string;
  content: string[];
}
interface PdfJsonObject {
  title: string;
  sections: PdfSection[];
}

const ReportForm = ({ eventId, userId, event }: ReportFormProps) => {
  const [files, setFiles] = useState<File[]>([]);
  const { startUpload } = useUploadThing("imageUploader");
  const { toast } = useToast();

  // State to manage the UI: show form, or show PDF viewer
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      preparedBy: "", eventPurpose: "", keyHighlights: "", majorOutcomes: "",
      objective: "", targetAudience: "", eventGoals: "", agenda: "",
      partners: "", budgetAllocation: "", vips: "", keySessions: "",
      photos: "", budget: "", sponsorship: "", actualExpenditure: ""
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsGenerating(true);
    try {
      let uploadedImageUrl = values.photos;
      if (files.length > 0) {
        const uploadedImages = await startUpload(files);
        if (!uploadedImages) throw new Error("Image upload failed.");
        uploadedImageUrl = uploadedImages[0].url;
      }

      const result = await generatePdfObject({
        report: { ...values, photos: uploadedImageUrl || "" },
        eventId,
      });

      if (!result.success || !result.pdfObject) {
        throw new Error(result.error || "Failed to get PDF data from AI.");
      }

      // --- PDF Generation from JSON Object ---
      const doc = new jsPDF();
      const pdfData = result.pdfObject as PdfJsonObject;
      let y = 20;

      doc.setFontSize(22);
      doc.setFont("helvetica", "bold");
      doc.text(pdfData.title, 105, y, { align: "center" });
      y += 15;

      pdfData.sections.forEach(section => {
        if (y > 270) { doc.addPage(); y = 20; }
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.text(section.heading, 15, y);
        y += 8;

        doc.setFontSize(12);
        doc.setFont("helvetica", "normal");
        section.content.forEach(line => {
          if (y > 280) { doc.addPage(); y = 20; }
          const splitLines = doc.splitTextToSize(line, 180);
          doc.text(splitLines, 15, y);
          y += (splitLines.length * 5) + 3;
        });
        y += 5;
      });

      // Generate a blob URL to display in the iframe
      const pdfBlobUrl = doc.output('datauristring');
      setPdfUrl(pdfBlobUrl);

      toast({ title: "Report Ready!", description: "Your AI-powered report is now visible below." });

    } catch (error) {
      toast({ title: "An Error Occurred", description: (error as Error).message, variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  }

  const downloadPdf = () => {
    if (!pdfUrl) return;
    const link = document.createElement('a');
    link.href = pdfUrl;
    link.download = `${event.title.replace(/\s+/g, '_')}_AI_report.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div>
      {/* --- Conditional Rendering: Show PDF or Show Form --- */}
      {pdfUrl ? (
        <div className="flex flex-col items-center gap-6">
          <h2 className="h2-bold text-center">Your Report is Ready</h2>
          <div className="w-full h-[700px] border rounded-lg">
            <iframe src={pdfUrl} width="100%" height="100%" title="PDF Report" />
          </div>
          <Button onClick={downloadPdf} size="lg" className="button w-full sm:w-fit">
            Download PDF
          </Button>
        </div>
      ) : (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-5">
            {/* The form fields are now visible again */}
            <div className="flex flex-col gap-5 md:flex-row"> <FormField control={form.control} name="preparedBy" render={({ field }) => (<FormItem className="w-full"><FormLabel>Prepared By</FormLabel><FormControl><Input placeholder="Your name or team name" {...field} /></FormControl><FormMessage /></FormItem>)} /> </div>
            <FormField control={form.control} name="eventPurpose" render={({ field }) => (<FormItem className="w-full"><FormLabel>Event Purpose</FormLabel><FormControl><Textarea placeholder="Describe the main purpose of the event" {...field} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="keyHighlights" render={({ field }) => (<FormItem className="w-full"><FormLabel>Key Highlights</FormLabel><FormControl><Textarea placeholder="What were the standout moments?" {...field} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="majorOutcomes" render={({ field }) => (<FormItem className="w-full"><FormLabel>Major Outcomes</FormLabel><FormControl><Textarea placeholder="What were the major results or outcomes?" {...field} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="objective" render={({ field }) => (<FormItem className="w-full"><FormLabel>Objective</FormLabel><FormControl><Textarea placeholder="What was the event's primary objective?" {...field} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="targetAudience" render={({ field }) => (<FormItem className="w-full"><FormLabel>Target Audience</FormLabel><FormControl><Textarea placeholder="Who was the intended audience?" {...field} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="eventGoals" render={({ field }) => (<FormItem className="w-full"><FormLabel>Event Goals</FormLabel><FormControl><Textarea placeholder="What goals were set for the event?" {...field} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="agenda" render={({ field }) => (<FormItem className="w-full"><FormLabel>Event Schedule / Agenda</FormLabel><FormControl><Textarea placeholder="Provide the event's schedule or agenda" {...field} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="partners" render={({ field }) => (<FormItem className="w-full"><FormLabel>Partners, Sponsors, Collaborators</FormLabel><FormControl><Input placeholder="List any partners, sponsors, etc." {...field} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="budgetAllocation" render={({ field }) => (<FormItem className="w-full"><FormLabel>Budget Allocation & Resources Used</FormLabel><FormControl><Textarea placeholder="Describe how the budget and resources were used" {...field} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="vips" render={({ field }) => (<FormItem className="w-full"><FormLabel>VIPs, Speakers, Performers Present</FormLabel><FormControl><Input placeholder="List key people who were present" {...field} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="keySessions" render={({ field }) => (<FormItem className="w-full"><FormLabel>Key Sessions / Speeches / Workshops</FormLabel><FormControl><Textarea placeholder="Describe the most important sessions" {...field} /></FormControl><FormMessage /></FormItem>)} />
            <div className="flex flex-col gap-5 md:flex-row">
              <FormField control={form.control} name="budget" render={({ field }) => (<FormItem className="w-full"><FormLabel>Budgeted Cost (INR)</FormLabel><FormControl><Input type="number" placeholder="e.g., 50000" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="actualExpenditure" render={({ field }) => (<FormItem className="w-full"><FormLabel>Actual Expenditure (INR)</FormLabel><FormControl><Input type="number" placeholder="e.g., 45000" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="sponsorship" render={({ field }) => (<FormItem className="w-full"><FormLabel>Sponsorship / Funding (INR)</FormLabel><FormControl><Input type="number" placeholder="e.g., 10000" {...field} /></FormControl><FormMessage /></FormItem>)} />
            </div>
            <FormField control={form.control} name="photos" render={({ field }) => (<FormItem className="w-full"><FormLabel>Link to Photos/Videos</FormLabel><FormControl><FileUploader onFieldChange={field.onChange} imageUrl={field.value || ""} setFiles={setFiles} /></FormControl><FormMessage /></FormItem>)} />
            <Button type="submit" size="lg" disabled={isGenerating} className="button col-span-2 w-full">
              {isGenerating ? "Generating AI Report..." : "Generate AI Report & View PDF"}
            </Button>
          </form>
        </Form>
      )}
    </div>
  );
};

export default ReportForm;