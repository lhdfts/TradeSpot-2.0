
// Map Pipeline ID to Product Name
export const PIPEDRIVE_PRODUCT_MAP: Record<number, string> = {
    105: 'LAB',
    90: 'Tribo 3.0 A',
    89: 'Tribo 3.0 S',
    103: 'Aldeia',
    104: 'Aldeia Presencial'
};

// Map Pipeline ID to Stages that should be considered "Cancelled" or "Invalid" for history
// We filter these OUT.
// Map Pipeline ID to Stages that should be considered "Blocked"
export const BLOCKED_STAGE_IDS: Record<number, number> = {
    105: 870, // LAB: Bloqueado
    90: 798,  // Tribo 3.0 A: Bloqueado
    89: 799,  // Tribo 3.0 S: Bloqueado
    103: 850, // Aldeia: Bloqueado
    104: 861  // Aldeia Presencial: Bloqueado
};

// Map Pipeline ID to Stages that should be considered "Cancelled"
export const CANCELLED_STAGE_IDS: Record<number, number> = {
    105: 871, // LAB: Cancelado
    90: 740,  // Tribo 3.0 A: Cancelado
    89: 729,  // Tribo 3.0 S: Cancelado
    103: 851, // Aldeia: Cancelado
    104: 860  // Aldeia Presencial: Cancelado
};
