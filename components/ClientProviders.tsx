"use client";
import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { ThemeProvider } from "@/components/theme-provider";
const ClientClerk = dynamic(() => import("@/components/ClientClerk"), { ssr: false });

interface ClientProvidersProps {
    children: React.ReactNode;
}

export default function ClientProviders({ children }: ClientProvidersProps) {
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    if (!isMounted) {
        return null;
    }

    return (
        <ClientClerk>
            <ThemeProvider
                attribute="class"
                defaultTheme="light"
                enableSystem
                disableTransitionOnChange
            >
                {children}
            </ThemeProvider>
        </ClientClerk>
    );
}


