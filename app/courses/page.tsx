"use client"

import { MainNav } from "@/components/main-nav"
import { CourseCard } from "@/components/course-card"
import { CreateCourseModal } from "@/components/create-course-modal"
import { Button } from "@/components/ui/button"
import { Plus } from 'lucide-react'
import { useState } from "react"
import { useCourses } from "@/lib/course-context"

export default function CoursesPage() {
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [courseToEdit, setCourseToEdit] = useState(null);
  const { courses, removeCourse, addCourse } = useCourses()

  const handleCustomize = (course) => {
    setCourseToEdit(course); // 设置要编辑的课程
    setCreateModalOpen(true); // 打开 modal
  };

  const handleAddCourse = () => {
    setCourseToEdit(null); // 清空编辑课程
    setCreateModalOpen(true); // 打开 modal
  };

  return (
    <div className="flex min-h-screen bg-background">
      <MainNav />
      <main className="flex-1 p-8 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">My Courses</h1>
          <Button onClick={handleAddCourse}>
            <Plus className="w-4 h-4 mr-2" />
            Add Course
          </Button>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => (
            <CourseCard
              key={course.id}
              id={course.id}
              title={course.title}
              progress={course.progress}
              aiTutor={course.aiTutor}
              startDate={course.startDate}
              endDate={course.endDate}
              onCustomize={() => handleCustomize(course)} // 传递当前课程
              onRemove={() => removeCourse(course.id, course.title)}
            />
          ))}
        </div>
        <CreateCourseModal
          open={createModalOpen}
          onOpenChange={setCreateModalOpen}
          onSave={(courseData) => {
            addCourse(courseData);
            setCreateModalOpen(false);
          }}
          courseToEdit={courseToEdit} // 传递要编辑的课程
        />
      </main>
    </div>
  );
}

