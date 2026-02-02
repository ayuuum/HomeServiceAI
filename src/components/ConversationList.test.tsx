import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ConversationList } from './ConversationList';
import { mockSupabase } from '@/test/mocks/supabase';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import '../../vitest.setup';

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: false,
        },
    },
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

describe('ConversationList', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('shows loading state initially', () => {
        mockSupabase.from.mockReturnValue({
            select: vi.fn().mockReturnThis(),
            not: vi.fn().mockResolvedValue({ data: null, error: null }),
        });

        render(<ConversationList selectedCustomerId={null} onSelectConversation={vi.fn()} />, { wrapper });
        expect(screen.getByText('読み込み中...')).toBeInTheDocument();
    });

    it('shows empty state when no conversations', async () => {
        mockSupabase.from.mockReturnValue({
            select: vi.fn().mockReturnThis(),
            not: vi.fn().mockResolvedValue({ data: [], error: null }),
        });

        render(<ConversationList selectedCustomerId={null} onSelectConversation={vi.fn()} />, { wrapper });

        await waitFor(() => {
            expect(screen.getByText('会話がありません')).toBeInTheDocument();
        });
    });

    it('renders conversation list when data is available', async () => {
        const mockCustomers = [
            { id: '1', name: 'Ayumu', avatar_url: null, line_user_id: 'u123' }
        ];
        const mockMessages = [
            { content: 'Hello', sent_at: new Date().toISOString(), direction: 'inbound', read_at: null }
        ];

        // Setup nested mocks for customers and messages
        mockSupabase.from.mockImplementation((table) => {
            if (table === 'customers') {
                return {
                    select: vi.fn().mockReturnThis(),
                    not: vi.fn().mockResolvedValue({ data: mockCustomers, error: null }),
                };
            }
            if (table === 'line_messages') {
                return {
                    select: vi.fn().mockReturnThis(),
                    eq: vi.fn().mockReturnThis(),
                    order: vi.fn().mockReturnThis(),
                    limit: vi.fn().mockResolvedValue({ data: mockMessages, error: null }),
                    is: vi.fn().mockResolvedValue({ count: 1, error: null }),
                };
            }
            return {
                select: vi.fn().mockReturnThis(),
            };
        });

        render(<ConversationList selectedCustomerId={null} onSelectConversation={vi.fn()} />, { wrapper });

        await waitFor(() => {
            expect(screen.getByText('Ayumu')).toBeInTheDocument();
            expect(screen.getByText('Hello')).toBeInTheDocument();
        });
    });
});
