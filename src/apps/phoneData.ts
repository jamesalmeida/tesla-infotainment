// Everything here is invented. Numbers use the 555-01xx range set aside for fiction, and nothing
// in the app can place a call or send a message: there is no tel: link and no network request.

export interface Contact {
  id: string;
  name: string;
  number: string;
  label: string;
}

export interface Message {
  id: string;
  fromMe: boolean;
  text: string;
  // Minutes before now, so the demo always looks recent.
  minutesAgo: number;
}

export interface Conversation {
  contactId: string;
  messages: Message[];
}

export const CONTACTS: Contact[] = [
  { id: 'ada', name: 'Ada Whitlock', number: '(415) 555-0111', label: 'Mobile' },
  { id: 'bo', name: 'Bo Tanaka-Reyes', number: '(415) 555-0123', label: 'Work' },
  { id: 'cass', name: 'Cass Oyelaran', number: '(510) 555-0134', label: 'Mobile' },
  { id: 'dev', name: 'Dev Marchetti', number: '(650) 555-0142', label: 'Home' },
  { id: 'eli', name: 'Eli Vandersloot', number: '(415) 555-0156', label: 'Mobile' },
  { id: 'fen', name: 'Fen Abernathy', number: '(510) 555-0167', label: 'Mobile' },
  { id: 'gia', name: 'Gia Nakamori', number: '(650) 555-0178', label: 'Work' },
  { id: 'hal', name: 'Hal Quillfeather', number: '(415) 555-0189', label: 'Home' },
];

export const CONVERSATIONS: Conversation[] = [
  {
    contactId: 'ada',
    messages: [
      { id: 'a1', fromMe: false, text: 'Are you still okay for dinner?', minutesAgo: 95 },
      { id: 'a2', fromMe: true, text: 'Yes! Leaving soon.', minutesAgo: 90 },
      { id: 'a3', fromMe: false, text: 'Great. Parking is on the north side.', minutesAgo: 12 },
    ],
  },
  {
    contactId: 'bo',
    messages: [
      {
        id: 'b1',
        fromMe: false,
        text: 'Moved the check-in to 9:15, hope that works.',
        minutesAgo: 240,
      },
    ],
  },
  {
    contactId: 'cass',
    messages: [
      { id: 'c1', fromMe: true, text: 'Do you need anything from the store?', minutesAgo: 400 },
      { id: 'c2', fromMe: false, text: 'Lemons and a bag of ice please.', minutesAgo: 385 },
    ],
  },
];

// A message that can be made to "arrive" for the demo.
export const SIMULATED_ARRIVAL = {
  contactId: 'eli',
  text: 'Running ten minutes late. Save me a seat!',
};

export const findContact = (id: string): Contact | undefined =>
  CONTACTS.find((contact) => contact.id === id);

export const searchContacts = (query: string): Contact[] => {
  const needle = query.trim().toLowerCase();
  const digits = needle.replace(/\D/g, '');
  const sorted = [...CONTACTS].sort((a, b) => a.name.localeCompare(b.name));
  if (!needle) return sorted;
  return sorted.filter(
    (contact) =>
      contact.name.toLowerCase().includes(needle) ||
      (digits.length > 0 && contact.number.replace(/\D/g, '').includes(digits)),
  );
};

export const findContactByNumber = (number: string): Contact | undefined => {
  const digits = number.replace(/\D/g, '');
  return CONTACTS.find((contact) => contact.number.replace(/\D/g, '') === digits);
};

// The Bluetooth app doesn't publish a paired device yet (#149). Until it does, this is the
// stand-in, and it is the only thing to replace to show the real paired phone.
export const connectedPhoneName = (): string => 'Demo Phone (simulated)';
