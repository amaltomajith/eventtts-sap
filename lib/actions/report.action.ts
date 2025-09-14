// lib/actions/report.action.ts

"use server";

import { CreateReportParams } from "@/types";
import { connectToDatabase } from "../dbconnection";
import Event from "../models/event.model";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getEventStatistics } from "./order.action";
import Report from "../models/report.model";
import User from "../models/user.model";

export async function generatePdfObject({
  report,
  eventId,
}: Omit<CreateReportParams, 'path' | 'userId'>) {
  try {
    await connectToDatabase();

    const event = await Event.findById(eventId).populate('category');
    if (!event) throw new Error("Event not found");

    const stats = await getEventStatistics(eventId);

    // --- Gemini API Integration ---
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    
    // --- THIS IS THE FIX ---
    // Update the model name from "gemini-pro" to "gemini-1.5-flash"
    const model = genAI.getGenerativeModel({ 
        model: "gemini-1.5-flash", 
        generationConfig: {
            responseMimeType: "application/json"
        }
    });

    const prompt = `
      Analyze the following event data and user-provided notes.
      Generate a structured JSON object representing a professional event report.
      The JSON object must follow this exact schema:
      {
        "title": "string",
        "sections": [
          { "heading": "string", "content": ["string", "string", ...] },
          { "heading": "string", "content": ["string", "string", ...] }
        ]
      }
      Do not include any markdown or formatting in the JSON values.
      Calculate the Profit/Loss based on the financial data and include it in the 'Financial Summary' section.

      **Event Database Details:**
      - Event Title: ${event.title}
      - Event Category: ${event.category.name}
      - Event Description: ${event.description}
      - Start Date & Time: ${event.startDate.toString()}
      - Location: ${event.isOnline ? 'Online' : event.location}
      - Total Seating Capacity: ${event.totalCapacity}
      - Actual Attendance (Tickets Sold): ${stats.totalTicketsSold}
      - Total Revenue from Tickets: ${stats.totalRevenue} INR

      **User-Provided Report Details:**
      - Prepared By: ${report.preparedBy}
      - Event Purpose: ${report.eventPurpose}
      - Key Highlights: ${report.keyHighlights}
      - Major Outcomes: ${report.majorOutcomes}
      - Budgeted Cost: ${report.budget} INR
      - Actual Expenditure: ${report.actualExpenditure} INR
      - Sponsorships/Funding Received: ${report.sponsorship || '0'} INR
      - Photos: ${report.photos || 'Not provided.'}

      Create sections for "Executive Summary", "Event Performance", "Financial Summary", and "Key Learnings".
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const jsonText = response.text();
    
    const pdfObject = JSON.parse(jsonText);
    
    return { success: true, pdfObject };
  } catch (error) {
    console.log(error);
    return { success: false, error: (error as Error).message };
  }
}
export async function getReportById(reportId: string) {
  try {
    await connectToDatabase();

    const report = await Report.findById(reportId)
      .populate({
        path: 'event',
        model: Event,
        select: '_id title' // Select specific fields from the event
      })
      .populate({
        path: 'generatedBy',
        model: User,
        select: '_id firstName lastName' // Select specific fields from the user
      });

    if (!report) {
      throw new Error("Report not found");
    }

    return JSON.parse(JSON.stringify(report));
  } catch (error) {
    console.log(error);
    throw error;
  }
}
