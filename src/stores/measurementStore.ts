import { createStore } from "zustand/vanilla";
import {
  validateMeasurementFrame,
  type MeasurementFrame,
} from "../models/measurement";

export interface MeasurementStore {
  primarySourceId?: string;
  overlaySourceIds: string[];
  latestFrames: Record<string, MeasurementFrame>;
  setPrimarySource: (sourceId: string) => void;
  toggleOverlay: (sourceId: string) => void;
  ingestFrame: (frame: MeasurementFrame) => void;
}

export function createMeasurementStore() {
  return createStore<MeasurementStore>((set) => ({
    overlaySourceIds: [],
    latestFrames: {},
    setPrimarySource: (primarySourceId) =>
      set((state) => ({
        primarySourceId,
        overlaySourceIds: state.overlaySourceIds.filter(
          (sourceId) => sourceId !== primarySourceId,
        ),
      })),
    toggleOverlay: (sourceId) =>
      set((state) => ({
        overlaySourceIds: state.overlaySourceIds.includes(sourceId)
          ? state.overlaySourceIds.filter((current) => current !== sourceId)
          : [...state.overlaySourceIds, sourceId],
      })),
    ingestFrame: (frame) => {
      const errors = validateMeasurementFrame(frame);
      if (errors.length > 0) {
        throw new Error(`invalid measurement frame: ${errors.join("; ")}`);
      }
      set((state) => ({
        latestFrames: { ...state.latestFrames, [frame.sourceId]: frame },
      }));
    },
  }));
}
