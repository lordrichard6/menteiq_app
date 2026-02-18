
import { createClient } from '@/lib/supabase/client';
import { type Booking } from '@/lib/types/schema';

export const BookingService = {
    async getMyBookings(): Promise<Booking[]> {
        const supabase = createClient();

        // Get current user email to find contact_id
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];

        const { data: contact } = await supabase.from('contacts').select('id').eq('email', user.email).single();
        if (!contact) return []; // Or mock some if no contact found

        const { data } = await supabase
            .from('bookings')
            .select('*')
            .eq('contact_id', contact.id)
            .gte('start_time', new Date().toISOString())
            .order('start_time', { ascending: true });

        return (data as any) || [];
    },

    async mockCreateBooking(_title: string, _date: Date) {
        // Logic to sync with external calendar would go here
        return true;
    }
};
