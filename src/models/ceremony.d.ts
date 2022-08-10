export type ComputeMode =
  | "ZKEY"
  | "POWERSOFTAU";

export type CeremonyState =
  | "PRESELECTION"
  | "SELECTED"
  | "RUNNING"
  | "COMPLETE"
  | "WAITING"
  | "PAUSED"
  | "UNKNOWN";

export interface Ceremony {
    // user should input this
    id: string;
    title: string;
    serverURL: string;
    description: string;
    circuitFileName: string;
    mode: ComputeMode;
    instructions: string;
    github: string;
    homepage: string;
    adminAddr: string;
    startTime: Date;
    endTime: Date;
    minParticipants: number;
    // server would compute this
    ceremonyState: CeremonyState;
    zkeyPrefix: string;
    paused: boolean;
    selectBlock: number;
    lastSummaryUpdate: Date;
    maxTier2: number;
    sequence: number;
    ceremonyProgress: number;
    numParticipants: number;
    complete: number;
    waiting: number;
    currentIndex: number;
    lastValidIndex: number;
    highestQueueIndex: number;
    completedAt?: Date;
    numConstraints?: number;
    averageDuration?: number;
    transcript?: string;
    hash?: string; // Participant's own hash
    isCompleted?: boolean; // Participant has completed this circuit
}