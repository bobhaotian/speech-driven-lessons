"use client"

import { useState } from "react"
import { ChevronLeft, ChevronRight, Plus, CalendarIcon } from 'lucide-react'
import { format, addDays, subDays, parse, differenceInMinutes, startOfDay } from "date-fns"

import { MainNav } from "@/components/main-nav"
import { CourseDetails } from "@/components/course-details"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

// Time slots from 8:00 AM to 8:00 PM
const timeSlots = Array.from({ length: 13 }, (_, i) => {
    const hour = i + 8
    return `${hour.toString().padStart(2, "0")}:00`
})

const sampleCourse = {
    id: "1",
    title: "CS240 AI Tutor",
    tutor: "AI Tutor",
    email: "cs240.tutor@example.com",
    zoomLink: "https://zoom.us/j/123456789",
    date: "2024-01-20",
    startTime: "08:00",
    endTime: "09:10",
    description: "We will talk about AVL trees, sorting algorithms, and binary search trees.",
}

interface Appointment {
    id: string
    title: string
    tutor: string
    email: string
    zoomLink: string
    date: string
    startTime: string
    endTime: string
    description: string
}

export default function SchedulePage() {
    const [selectedCourse, setSelectedCourse] = useState<Appointment | null>(null)
    const [selectedDate, setSelectedDate] = useState<Date>(new Date())
    const [appointments, setAppointments] = useState<Appointment[]>([sampleCourse])

    const handlePrevDay = () => setSelectedDate(subDays(selectedDate, 1))
    const handleNextDay = () => setSelectedDate(addDays(selectedDate, 1))

    const handleNewAppointment = () => {
        const newAppointment: Appointment = {
            ...sampleCourse,
            id: `appointment-${appointments.length + 1}`,
            title: `New Appointment ${appointments.length + 1}`,
            date: format(selectedDate, "yyyy-MM-dd"),
            startTime: "10:00",
            endTime: "11:00",
        }
        setAppointments([...appointments, newAppointment])
    }

    const getAppointmentStyle = (appointment: Appointment) => {
        const startTime = parse(appointment.startTime, "HH:mm", new Date())
        const endTime = parse(appointment.endTime, "HH:mm", new Date())
        const dayStart = parse("08:00", "HH:mm", new Date())

        const startMinutes = differenceInMinutes(startTime, dayStart)
        const duration = differenceInMinutes(endTime, startTime)

        const topPercentage = (startMinutes / (12 * 60)) * 100
        const heightPercentage = (duration / (12 * 60)) * 100

        return {
            top: `${topPercentage}%`,
            height: `${heightPercentage}%`,
        }
    }

    return (
        <div className="flex h-screen">
            <MainNav />
            <div className="flex flex-1">
                <div className="flex-1">
                    <div className="flex h-14 items-center justify-between border-b px-4">
                        <div className="flex items-center gap-4">
                            <Input
                                placeholder="Search courses..."
                                className="w-[200px]"
                            />
                            <div className="flex items-center gap-2">
                                <Button variant="ghost" size="icon" onClick={handlePrevDay}>
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className="min-w-[240px] justify-start text-left font-normal">
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {format(selectedDate, "MMMM d, yyyy")}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={selectedDate}
                                            onSelect={(date) => date && setSelectedDate(date)}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                                <Button variant="ghost" size="icon" onClick={handleNextDay}>
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                        <Button onClick={handleNewAppointment}>
                            <Plus className="mr-2 h-4 w-4" />
                            New Appointment
                        </Button>
                    </div>
                    <ScrollArea className="h-[calc(100vh-3.5rem)]">
                        <div className="relative" style={{ height: "calc(12 * 60px)" }}>
                            {timeSlots.map((timeSlot, index) => (
                                <div
                                    key={timeSlot}
                                    className="absolute w-full border-b py-2"
                                    style={{ top: `${index * 60}px`, height: "60px" }}
                                >
                                    <div className="absolute left-0 w-20 px-4 text-sm text-muted-foreground">
                                        {timeSlot}
                                    </div>
                                </div>
                            ))}
                            {appointments
                                .filter(appointment => appointment.date === format(selectedDate, "yyyy-MM-dd"))
                                .map((appointment) => (
                                    <button
                                        key={appointment.id}
                                        onClick={() => setSelectedCourse(appointment)}
                                        className="absolute left-24 right-4 rounded-lg bg-primary/10 p-2 text-left hover:bg-primary/20"
                                        style={getAppointmentStyle(appointment)}
                                    >
                                        <p className="font-medium">{appointment.title}</p>
                                        <p className="text-sm text-muted-foreground">
                                            {appointment.startTime} - {appointment.endTime}
                                        </p>
                                    </button>
                                ))
                            }
                        </div>
                    </ScrollArea>
                </div>
                {selectedCourse && (
                    <CourseDetails
                        course={selectedCourse}
                        selectedDate={selectedDate}
                        onClose={() => setSelectedCourse(null)}
                    />
                )}
            </div>
        </div>
    )
}

