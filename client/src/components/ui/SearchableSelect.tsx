import React, { useState, useRef, useEffect, useCallback } from 'react';
import { HiChevronDown, HiSearch, HiX } from 'react-icons/hi';

export interface SelectOption {
    value: string;
    label: string;
}

interface SearchableSelectProps {
    options: SelectOption[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    allLabel?: string; // If provided, shows an "All" or "Empty" option at the top
    className?: string;
    disabled?: boolean;
    required?: boolean;
    hasError?: boolean;
}

const SearchableSelect: React.FC<SearchableSelectProps> = ({
    options,
    value,
    onChange,
    placeholder = 'Select...',
    allLabel,
    className = '',
    disabled = false,
    required = false,
    hasError = false,
}) => {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [highlightedIndex, setHighlightedIndex] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);
    const searchRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLUListElement>(null);

    const selectedLabel = value
        ? options.find(o => o.value === value)?.label ?? placeholder
        : (allLabel || placeholder);

    const filtered = search.trim()
        ? options.filter(o => {
            const label = o.label.toLowerCase();
            const searchWords = search.toLowerCase().split(' ').filter(word => word.length > 0);
            return searchWords.every(word => label.includes(word));
        })
        : options;

    const displayList = allLabel 
        ? [{ value: '', label: allLabel } as SelectOption, ...filtered]
        : filtered;

    // Reset highlight when filter changes
    useEffect(() => {
        setHighlightedIndex(0);
    }, [search]);

    // Focus search input when open
    useEffect(() => {
        if (open && searchRef.current) {
            searchRef.current.focus();
        }
    }, [open]);

    // Close on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false);
                setSearch('');
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const scrollIntoView = useCallback((index: number) => {
        if (listRef.current) {
            const item = listRef.current.children[index] as HTMLElement;
            item?.scrollIntoView({ block: 'nearest' });
        }
    }, []);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!open) {
            if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
                setOpen(true);
            }
            return;
        }
        switch (e.key) {
            case 'ArrowDown': {
                const next = Math.min(highlightedIndex + 1, displayList.length - 1);
                setHighlightedIndex(next);
                scrollIntoView(next);
                e.preventDefault();
                break;
            }
            case 'ArrowUp': {
                const prev = Math.max(highlightedIndex - 1, 0);
                setHighlightedIndex(prev);
                scrollIntoView(prev);
                e.preventDefault();
                break;
            }
            case 'Enter': {
                const selected = displayList[highlightedIndex];
                if (selected) {
                    onChange(selected.value);
                    setOpen(false);
                    setSearch('');
                }
                e.preventDefault();
                break;
            }
            case 'Escape': {
                setOpen(false);
                setSearch('');
                break;
            }
        }
    };

    const handleSelect = (opt: SelectOption) => {
        onChange(opt.value);
        setOpen(false);
        setSearch('');
    };

    const showCount = options.length > 0;

    return (
        <div ref={containerRef} className={`relative ${className}`} onKeyDown={handleKeyDown}>
            {/* Trigger button */}
            <button
                type="button"
                disabled={disabled}
                data-error-field={hasError ? 'true' : undefined}
                onClick={() => {
                    if (!disabled) setOpen(prev => !prev);
                }}
                className={`
                    w-full flex items-center justify-between gap-2
                    px-3 py-2 rounded-xl border text-sm font-medium
                    transition-all duration-150 focus:outline-none
                    ${disabled
                        ? 'bg-surface-100 text-surface-400 border-surface-200 cursor-not-allowed'
                        : open
                            ? 'bg-white border-primary-500 ring-2 ring-primary-100 text-surface-900'
                            : hasError
                                ? 'bg-white border-red-500 focus:ring-red-400 text-surface-900'
                                : 'bg-white border-surface-200 text-surface-700 hover:border-surface-300'
                    }
                `}
                aria-haspopup="listbox"
                aria-expanded={open}
            >
                <div className="flex items-center gap-2 truncate">
                    <HiSearch className="w-3.5 h-3.5 text-surface-400 flex-shrink-0" />
                    <span className={`truncate ${!value && !allLabel ? 'text-surface-400' : ''}`}>
                        {selectedLabel}
                    </span>
                </div>

                {/* Hidden input for native form validation */}
                <input
                    type="text"
                    required={required}
                    value={value}
                    onChange={() => {}} // Read-only but keeps React happy
                    className="absolute opacity-0 w-0 h-0 pointer-events-none"
                    tabIndex={-1}
                />

                <span className="flex items-center gap-1 flex-shrink-0">
                    <HiChevronDown
                        className={`w-4 h-4 text-surface-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
                    />
                </span>
            </button>

            {/* Dropdown */}
            {open && (
                <div className="
                    absolute z-50 top-full left-0 right-0 mt-1
                    bg-white border border-surface-200 rounded-xl shadow-lg shadow-surface-900/10
                    animate-in fade-in slide-in-from-top-1 duration-150
                    overflow-hidden
                ">
                    {/* Search box — Always shown for searchable fields */}
                    <div className="p-2 border-b border-surface-100">
                        <div className="flex items-center gap-2 px-2 py-1.5 bg-surface-50 rounded-lg">
                            <HiSearch className="w-3.5 h-3.5 text-surface-400 flex-shrink-0" />
                            <input
                                ref={searchRef}
                                type="text"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Start typing to search..."
                                className="flex-1 bg-transparent text-sm text-surface-700 placeholder-surface-400 outline-none min-w-0"
                            />
                            {search && (
                                <button onClick={() => setSearch('')} className="text-surface-400 hover:text-surface-600">
                                    <HiX className="w-3 h-3" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Options list */}
                    <ul
                        ref={listRef}
                        role="listbox"
                        className="py-1 max-h-56 overflow-y-auto overscroll-contain"
                    >
                        {displayList.length === 0 ? (
                            <li className="px-3 py-3 text-sm text-surface-400 text-center">
                                No results for "{search}"
                            </li>
                        ) : (
                            displayList.map((opt, idx) => {
                                const isSelected = opt.value === value || (opt.value === '' && !value);
                                const isHighlighted = idx === highlightedIndex;
                                return (
                                    <li
                                        key={opt.value === '' ? '__all__' : opt.value}
                                        role="option"
                                        aria-selected={isSelected}
                                        onMouseEnter={() => setHighlightedIndex(idx)}
                                        onClick={() => handleSelect(opt)}
                                        className={`
                                            flex items-center justify-between
                                            px-3 py-2 text-sm cursor-pointer select-none
                                            transition-colors duration-100
                                            ${isSelected
                                                ? 'bg-primary-50 text-primary-700 font-medium'
                                                : isHighlighted
                                                    ? 'bg-surface-50 text-surface-800'
                                                    : 'text-surface-700'
                                            }
                                        `}
                                    >
                                        <span className="truncate">{opt.label}</span>
                                        {isSelected && (
                                            <svg className="w-4 h-4 text-primary-600 flex-shrink-0 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                            </svg>
                                        )}
                                    </li>
                                );
                            })
                        )}
                    </ul>

                    {/* Footer count badge when many options */}
                    {showCount && filtered.length < options.length && (
                        <div className="px-3 py-1.5 border-t border-surface-100 bg-surface-50">
                            <p className="text-xs text-surface-400">
                                Showing {filtered.length} of {options.length}
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default SearchableSelect;
