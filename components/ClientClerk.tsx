"use client";
import React, { useEffect, useState } from "react";
import { ClerkProvider } from "@clerk/nextjs";

interface ClientClerkProps {
    children: React.ReactNode;
}

export default function ClientClerk({ children }: ClientClerkProps) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return null;
    }

    return (
        <ClerkProvider>
            {children}
        </ClerkProvider>
    );
}


