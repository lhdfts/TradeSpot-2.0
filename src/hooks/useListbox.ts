import { useCallback, useEffect, useId, useRef, useState } from 'react';
import type React from 'react';

// Padrão "listbox" (WAI-ARIA, combobox só de seleção) para os selects customizados.
// O foco fica no gatilho; a opção ativa é indicada por aria-activedescendant.
// Setas/Home/End movem a opção ativa, Enter/Espaço selecionam, Esc fecha.

interface UseListboxOptions {
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
    // Quantidade de opções navegáveis
    count: number;
    // Índice da opção selecionada (ou -1); vira a opção ativa ao abrir
    selectedIndex: number;
    onSelect: (index: number) => void;
    // Texto da opção, usado na busca por digitação (type-ahead)
    getLabel?: (index: number) => string;
    disabled?: boolean;
}

// Rola só a lista (não a página) até a opção ficar visível.
const scrollOptionIntoView = (el: HTMLElement) => {
    let parent = el.parentElement;
    while (parent && parent !== document.body) {
        if (parent.scrollHeight > parent.clientHeight) {
            const parentRect = parent.getBoundingClientRect();
            const elRect = el.getBoundingClientRect();
            if (elRect.top < parentRect.top) parent.scrollTop -= parentRect.top - elRect.top;
            else if (elRect.bottom > parentRect.bottom) parent.scrollTop += elRect.bottom - parentRect.bottom;
            return;
        }
        parent = parent.parentElement;
    }
};

export function useListbox({ isOpen, setIsOpen, count, selectedIndex, onSelect, getLabel, disabled }: UseListboxOptions) {
    const listboxId = useId();
    const [activeIndex, setActiveIndex] = useState(-1);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const optionRefs = useRef<(HTMLElement | null)[]>([]);
    // Índice pedido ao abrir pelo teclado (Home/End/ArrowUp)
    const pendingIndex = useRef<number | null>(null);
    // Enter/Espaço tratados no keydown não devem disparar também o clique do botão
    const suppressClick = useRef(false);
    const typeahead = useRef({ text: '', time: 0 });

    const optionId = useCallback((index: number) => `${listboxId}-opcao-${index}`, [listboxId]);

    useEffect(() => {
        if (isOpen) {
            const pending = pendingIndex.current;
            pendingIndex.current = null;
            setActiveIndex(pending ?? (selectedIndex >= 0 ? selectedIndex : 0));
        } else {
            setActiveIndex(-1);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    // Lista filtrada encolheu: mantém a opção ativa dentro dos limites
    useEffect(() => {
        if (isOpen && activeIndex >= count) setActiveIndex(count > 0 ? count - 1 : -1);
    }, [count, isOpen, activeIndex]);

    useEffect(() => {
        if (activeIndex < 0) return;
        const el = optionRefs.current[activeIndex];
        if (el) scrollOptionIntoView(el);
    }, [activeIndex]);

    const blockNextClick = () => {
        suppressClick.current = true;
        const release = () => setTimeout(() => { suppressClick.current = false; }, 0);
        window.addEventListener('keyup', release, { once: true });
    };

    const open = (index: number | null) => {
        pendingIndex.current = index;
        setIsOpen(true);
    };

    const handleTypeahead = (key: string) => {
        if (!getLabel || count === 0) return;
        const now = Date.now();
        const text = (now - typeahead.current.time > 500 ? '' : typeahead.current.text) + key.toLowerCase();
        typeahead.current = { text, time: now };
        const start = text.length === 1 ? activeIndex + 1 : Math.max(activeIndex, 0);
        for (let step = 0; step < count; step++) {
            const index = (start + step) % count;
            const label = getLabel(index).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
            if (label.startsWith(text)) {
                if (isOpen) setActiveIndex(index);
                else open(index);
                return;
            }
        }
    };

    /**
     * Teclado do gatilho. Com `fromInput` (campo de busca dentro da lista) o
     * Espaço, Home/End e letras ficam com o campo de texto.
     */
    const handleKeyDown = (e: React.KeyboardEvent, fromInput = false) => {
        if (disabled) return;
        const last = count - 1;

        if (!isOpen) {
            if (['ArrowDown', 'ArrowUp', 'Enter', ' ', 'Home', 'End'].includes(e.key)) {
                e.preventDefault();
                blockNextClick();
                open(e.key === 'Home' ? 0 : e.key === 'End' || e.key === 'ArrowUp' ? Math.max(last, 0) : null);
            } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
                handleTypeahead(e.key);
            }
            return;
        }

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setActiveIndex(i => Math.min(i + 1, last));
                break;
            case 'ArrowUp':
                e.preventDefault();
                setActiveIndex(i => Math.max(i - 1, 0));
                break;
            case 'Home':
            case 'End':
                if (fromInput) return;
                e.preventDefault();
                setActiveIndex(e.key === 'Home' ? 0 : last);
                break;
            case 'Enter':
            case ' ':
                if (e.key === ' ' && (fromInput || typeahead.current.text && Date.now() - typeahead.current.time < 500)) {
                    if (!fromInput) handleTypeahead(' ');
                    return;
                }
                e.preventDefault();
                blockNextClick();
                if (activeIndex >= 0 && activeIndex < count) onSelect(activeIndex);
                break;
            case 'Escape':
                // Não deixa o Esc fechar também o modal em volta
                e.preventDefault();
                e.stopPropagation();
                setIsOpen(false);
                triggerRef.current?.focus();
                break;
            case 'Tab':
                setIsOpen(false);
                break;
            default:
                if (!fromInput && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) handleTypeahead(e.key);
        }
    };

    /** Envolve o onClick do gatilho, ignorando o clique gerado por Enter/Espaço já tratados. */
    const handleTriggerClick = (toggle: () => void) => () => {
        if (suppressClick.current) {
            suppressClick.current = false;
            return;
        }
        toggle();
    };

    const getTriggerProps = () => ({
        ref: triggerRef,
        role: 'combobox' as const,
        'aria-haspopup': 'listbox' as const,
        'aria-expanded': isOpen,
        'aria-controls': isOpen ? listboxId : undefined,
        'aria-activedescendant': isOpen && activeIndex >= 0 && activeIndex < count ? optionId(activeIndex) : undefined,
        onKeyDown: (e: React.KeyboardEvent) => handleKeyDown(e),
    });

    const getOptionProps = (index: number, selected: boolean) => ({
        id: optionId(index),
        role: 'option' as const,
        'aria-selected': selected,
        ref: (el: HTMLElement | null) => { optionRefs.current[index] = el; },
        onMouseEnter: () => setActiveIndex(index),
        onMouseDown: (e: React.MouseEvent) => {
            // preventDefault: o foco continua no gatilho
            e.preventDefault();
            onSelect(index);
        },
    });

    return {
        listboxId,
        activeIndex,
        setActiveIndex,
        triggerRef,
        optionId,
        handleKeyDown,
        handleTriggerClick,
        getTriggerProps,
        getOptionProps,
    };
}
