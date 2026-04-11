import React, { createContext, useContext, useState, ReactNode } from "react";

export interface BookedSession {
  id: string;
  date: Date;
  time: string;
  counselorName: string;
  sessionType: string;
  note?: string;
  status: "upcoming" | "completed" | "cancelled";
}

interface BookingContextType {
  bookedSessions: BookedSession[];
  addBooking: (session: Omit<BookedSession, "id" | "status">) => void;
}

const BookingContext = createContext<BookingContextType>({} as BookingContextType);

export const useBooking = () => useContext(BookingContext);

export const BookingProvider = ({ children }: { children: ReactNode }) => {
  const [bookedSessions, setBookedSessions] = useState<BookedSession[]>([]);

  const addBooking = (session: Omit<BookedSession, "id" | "status">) => {
    const newSession: BookedSession = {
      ...session,
      id: `booking-${Date.now()}`,
      status: "upcoming",
    };
    setBookedSessions((prev) =>
      [...prev, newSession].sort((a, b) => a.date.getTime() - b.date.getTime())
    );
  };

  return (
    <BookingContext.Provider value={{ bookedSessions, addBooking }}>
      {children}
    </BookingContext.Provider>
  );
};
