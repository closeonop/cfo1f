"use client";
import { createContext, useContext } from "react";

export const TourContext = createContext({active:false, available:false, replay:() => {}});
export const useTour = () => useContext(TourContext);
