"use client";
import React, { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
	Form,
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "../ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Calendar } from "../ui/calendar";
import Image from "next/image";
import { Badge } from "../ui/badge";
import { categories } from "@/constants/categories";
import { createEvent, updateEvent } from "@/lib/actions/event.action";
import { Textarea } from "../ui/textarea";
import { useToast } from "../ui/use-toast";
import { useRouter } from "next/navigation";
import { FileUploader } from "./FileUploader";
import { useUploadThing } from "@/lib/uploadthing";
import SubEventForm from "./SubEventForm";

// ---------------- SUB EVENT SCHEMA ----------------
const subEventSchema = z.object({
	title: z.string().min(2, { message: "Title must be at least 2 characters." }),
	description: z.string().trim().min(2, { message: "Description must be at least 2 characters." }).optional(),
	photo: z.string().optional(),
	startDate: z.date(),
	endDate: z.date(),
	startTime: z.string(),
	endTime: z.string(),
	isOnline: z.boolean().optional(),
	location: z.string().trim().optional(),
	isFree: z.boolean(),
	price: z.string().trim().optional(),
	totalCapacity: z.string().trim().optional(),
});

// ---------------- EVENT SCHEMA ----------------
const formSchema = z.object({
	title: z.string().trim().min(2, { message: "Title must be at least 2 characters." }),
	category: z.string(),
	tags: z.array(z.string().min(2, { message: "Tag must be at least 2 characters." }))
		.min(1, { message: "At least one tag is required." }),
	description: z.string().trim().min(2, { message: "Description must be at least 2 characters." }),
	photo: z.string(),
	isOnline: z.boolean().optional(),
	location: z.string().trim().optional(),
	landmark: z.string().trim().optional(),
	startDate: z.date(),
	endDate: z.date(),
	startTime: z.string(),
	endTime: z.string(),
	duration: z.string().trim().optional(),
	totalCapacity: z.string().trim().optional(),
	isFree: z.boolean(),
	price: z.string().trim().optional(),
	ageRestriction: z.string().trim().optional(),
	url: z.string().trim().optional(),
	subEvents: z.array(subEventSchema).optional(),
});

// ---------------- INTERFACES ----------------
interface IEvent {
	_id: string;
	title: string;
	category: any;
	tags: any[];
	description: string;
	photo: string;
	isOnline?: boolean;
	location?: string;
	landmark?: string;
	startDate: string | Date;
	endDate: string | Date;
	startTime: string;
	endTime: string;
	duration?: number;
	totalCapacity?: number;
	isFree: boolean;
	price?: number;
	ageRestriction?: number;
	url?: string;
	organizer: string;
}

interface Props {
	userId: string;
	type: "create" | "edit";
	event?: IEvent;
	eventId?: string;
}

const EventForm = ({ userId, type = "create", event, eventId }: Props) => {
	const { toast } = useToast();
	const router = useRouter();

	const [isSubmitting, setIsSubmitting] = useState(false);
	const [files, setFiles] = useState<File[]>([]);
	const [CategoryData, setCategoryData] = useState([...categories]);
	const { startUpload } = useUploadThing("imageUploader");

	// ---------------- INITIAL VALUES ----------------
	const getInitialValues = () => {
		if (event && type === "edit") {
			const tagNames = event.tags.map(tag =>
				typeof tag === "object" ? tag.name : tag
			);

			return {
				title: event.title || "",
				category: event.category._id || event.category || "",
				tags: tagNames || [],
				description: event.description || "",
				photo: event.photo || "",
				isOnline: event.isOnline || false,
				location: event.location || "",
				landmark: event.landmark || "",
				startDate: new Date(event.startDate),
				endDate: new Date(event.endDate),
				startTime: event.startTime || "",
				endTime: event.endTime || "",
				duration: event.duration ? event.duration.toString() : "",
				totalCapacity: event.totalCapacity ? event.totalCapacity.toString() : "",
				isFree: event.isFree || false,
				price: event.price ? event.price.toString() : "",
				ageRestriction: event.ageRestriction ? event.ageRestriction.toString() : "",
				url: event.url || "",
				subEvents: [],
			};
		}
		return {
			title: "",
			category: "",
			tags: [],
			description: "",
			photo: "",
			isOnline: false,
			location: "",
			landmark: "",
			startDate: new Date(),
			endDate: new Date(),
			startTime: "",
			endTime: "",
			duration: "",
			totalCapacity: "",
			isFree: false,
			price: "",
			ageRestriction: "",
			url: "",
			subEvents: [],
		};
	};

	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: getInitialValues(),
	});

	const { fields, append, remove } = useFieldArray({
		name: "subEvents",
		control: form.control,
	});

	useEffect(() => {
		if (event && type === "edit") {
			form.reset(getInitialValues());
		}
	}, [event, type, form]);

	// ---------------- SUBMIT ----------------
	async function onSubmit(values: z.infer<typeof formSchema>) {
		setIsSubmitting(true);
		let uploadedImageUrl = values.photo;

		try {
			if (files.length > 0) {
				const uploadedImages = await startUpload(files);
				if (!uploadedImages) throw new Error("Please upload a valid image below of 4MB.");
				uploadedImageUrl = uploadedImages[0].url;
			}

			if (type === "edit") {
				if (!eventId) throw new Error("Event ID is required for updating.");

				const updatedEvent = await updateEvent({
					userId,
					event: {
						_id: eventId,
						...values,
						photo: uploadedImageUrl,
						imageUrl: uploadedImageUrl,
						duration: values.duration ? +values.duration : undefined,
						totalCapacity: values.totalCapacity ? +values.totalCapacity : undefined,
						price: values.price ? +values.price : undefined,
						ageRestriction: values.ageRestriction ? +values.ageRestriction : undefined,
					},
					path: `/event/${eventId}`,
				});

				if (updatedEvent) {
					form.reset();
					router.push(`/event/${updatedEvent._id}`);
					toast({ title: "Success!", description: "Event updated successfully." });
				}
			} else {
				const newEvent = await createEvent({
					...values,
					photo: uploadedImageUrl,
					imageUrl: uploadedImageUrl,
					duration: values.duration ? +values.duration : undefined,
					totalCapacity: values.totalCapacity ? +values.totalCapacity : undefined,
					price: values.price ? +values.price : undefined,
					ageRestriction: values.ageRestriction ? +values.ageRestriction : undefined,
					organizer: userId,
				});

				if (newEvent) {
					form.reset();
					router.push(`/event/${newEvent._id}`);
					toast({ title: "Success!", description: "Event created successfully." });
				}
			}
		} catch (error: any) {
			toast({ variant: "destructive", title: "Something went wrong.", description: error.message });
		} finally {
			setIsSubmitting(false);
		}
	}

	// ---------------- TAG HANDLING ----------------
	const handleKeyDown = (e: React.KeyboardEvent, field: any) => {
		if ((e.key === "Enter" && field.name === "tags") || (e.key === "," && field.name === "tags")) {
			e.preventDefault();
			const tagInput = e.target as HTMLInputElement;
			const tagValue = tagInput.value.trim().toLowerCase();

			if (tagValue.length > 15) {
				return form.setError("tags", { type: "required", message: "Max length should not exceed 15 characters" });
			}

			if (!field.value.includes(tagValue)) {
				form.setValue("tags", [...field.value, tagValue]);
				tagInput.value = "";
				form.clearErrors("tags");
			} else {
				form.setError("tags", { type: "validate", message: "Already exists" });
				form.trigger();
			}
		}
	};

	const removeTagHandler = (tag: string | { _id: string; name: string }, field: any) => {
		const newTags = field.value.filter((t: any) =>
			typeof t === "object" && typeof tag === "object" ? t._id !== tag._id : t !== tag
		);
		form.setValue("tags", newTags);
	};

	// ---------------- FORM JSX ----------------
	return (
		<Form {...form}>
			{/* FORM CONTENT (same as your UI) */}
			{/* ... keep all JSX ... */}
		</Form>
	);
};

export default EventForm;
