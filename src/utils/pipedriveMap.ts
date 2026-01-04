
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
export const CANCELLED_STAGE_IDS: Record<number, number[]> = {
    105: [870, 871], // LAB: Bloqueado, Cancelado
    90: [798, 740],  // Tribo 3.0 A: Bloqueado, Cancelado
    89: [799, 729],  // Tribo 3.0 S: Bloqueado, Cancelado
    103: [850, 851], // Aldeia: Bloqueado, Cancelado
    104: [861, 860]  // Aldeia Presencial: Bloqueado, Cancelado
};
