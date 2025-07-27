"use client"

import React from 'react'
import { CourseProvider } from "@/lib/course-context"

export default function CoursesLayout({ children }: { children: React.ReactNode }) {
    return (
        <CourseProvider>
            {children}
        </CourseProvider>
    )
}
