import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { AddressInput } from './AddressInput';
import React from 'react';
import { toast } from 'sonner';

// Setup mock for sonner toast
vi.mock('sonner', () => ({
    toast: {
        error: vi.fn(),
        success: vi.fn(),
    },
}));

describe('AddressInput', () => {
    const mockOnPostalCodeChange = vi.fn();
    const mockOnAddressChange = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should format postal code as XXX-XXXX', async () => {
        render(
            <AddressInput
                postalCode=""
                onPostalCodeChange={mockOnPostalCodeChange}
                address=""
                onAddressChange={mockOnAddressChange}
            />
        );

        const input = screen.getByLabelText('郵便番号');
        fireEvent.change(input, { target: { value: '1234567' } });

        expect(mockOnPostalCodeChange).toHaveBeenCalledWith('123-4567');
    });

    it('should auto-search address when 7 digits are entered', async () => {
        const mockResponse = {
            results: [
                {
                    address1: '東京都',
                    address2: '千代田区',
                    address3: '千代田',
                },
            ],
        };

        (global.fetch as any).mockResolvedValue({
            json: () => Promise.resolve(mockResponse),
        });

        render(
            <AddressInput
                postalCode=""
                onPostalCodeChange={mockOnPostalCodeChange}
                address=""
                onAddressChange={mockOnAddressChange}
            />
        );

        const input = screen.getByLabelText('郵便番号');
        fireEvent.change(input, { target: { value: '1000001' } });

        await waitFor(() => {
            expect(mockOnAddressChange).toHaveBeenCalledWith('東京都千代田区千代田');
        });
    });

    it('should show error toast when address is not found', async () => {
        const mockResponse = {
            results: null,
        };

        (global.fetch as any).mockResolvedValue({
            json: () => Promise.resolve(mockResponse),
        });

        render(
            <AddressInput
                postalCode="123-4567"
                onPostalCodeChange={mockOnPostalCodeChange}
                address=""
                onAddressChange={mockOnAddressChange}
            />
        );

        const searchButton = screen.getByText('住所検索');
        fireEvent.click(searchButton);

        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith('該当する住所が見つかりませんでした');
        });
    });
});
