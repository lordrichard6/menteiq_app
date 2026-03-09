
export interface ZefixCompany {
    name: string;
    uid: string;
    uidFormatted: string;
    address: {
        street?: string;
        houseNumber?: string;
        city: string;
        postalCode: string;
        country: string;
    };
}

export const ZefixService = {
    async searchByName(name: string): Promise<ZefixCompany[]> {
        try {
            const response = await fetch(
                `https://www.zefix.ch/ZefixREST/api/v1/company/search`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        name,
                        languageKey: 'en',
                        maxEntries: 10,
                    }),
                }
            );

            if (!response.ok) {
                throw new Error('Failed to fetch from Zefix');
            }

            const data = await response.json();

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return data.list.map((item: any) => ({
                name: item.name,
                uid: item.uid,
                uidFormatted: item.uidFormatted,
                address: {
                    street: item.address?.street,
                    houseNumber: item.address?.houseNumber,
                    city: item.address?.city,
                    postalCode: item.address?.swissZipCode,
                    country: 'CH'
                }
            }));
        } catch (error) {
            console.error('Zefix Search Error:', error);
            return [];
        }
    },

    async getByUID(uid: string): Promise<ZefixCompany | null> {
        // TODO: Implement direct UID lookup if needed
        return null;
    }
};
