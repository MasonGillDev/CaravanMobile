import { useMemo } from 'react';

export interface OpenStatus {
  isOpen: boolean;
  message: string | null;
  isClosingSoon: boolean;
  isOpeningSoon: boolean;
}

/**
 * Hook to determine if a place is open and generate appropriate status messages
 * @param hoursString - The hours string from the place (e.g., "Mon-Fri 9am-5pm, Sat-Sun 10am-6pm")
 * @returns OpenStatus object with open/closed state and timing messages
 */
export const useOpenStatus = (hoursString?: string): OpenStatus => {
  return useMemo(() => {
    if (!hoursString) {
      return {
        isOpen: true, // Assume open if no hours provided
        message: null,
        isClosingSoon: false,
        isOpeningSoon: false,
      };
    }

    try {
      const now = new Date();
      const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const currentTimeMinutes = currentHour * 60 + currentMinute;

      // Parse the hours string
      // Expected format examples:
      // "Mon-Fri 9:00 AM-5:00 PM, Sat-Sun 10:00 AM-6:00 PM"
      // "Daily 8:00 AM-10:00 PM"
      // "Mon-Sun 24 hours"

      const lowerHours = hoursString.toLowerCase();

      // Check for 24 hours
      if (lowerHours.includes('24 hours') || lowerHours.includes('open 24 hours')) {
        return {
          isOpen: true,
          message: 'Open 24 hours',
          isClosingSoon: false,
          isOpeningSoon: false,
        };
      }

      // Helper function to parse time string to minutes
      const parseTime = (timeStr: string): number => {
        const match = timeStr.match(/(\d+):?(\d+)?\s*(am|pm)/i);
        if (!match) return -1;

        let hours = parseInt(match[1]);
        const minutes = match[2] ? parseInt(match[2]) : 0;
        const period = match[3].toLowerCase();

        if (period === 'pm' && hours !== 12) hours += 12;
        if (period === 'am' && hours === 12) hours = 0;

        return hours * 60 + minutes;
      };

      // Helper to check if current day is in range
      const isDayInRange = (dayStr: string): boolean => {
        const dayMap: { [key: string]: number } = {
          sun: 0, sunday: 0,
          mon: 1, monday: 1,
          tue: 2, tuesday: 2,
          wed: 3, wednesday: 3,
          thu: 4, thursday: 4,
          fri: 5, friday: 5,
          sat: 6, saturday: 6,
        };

        const lowerDay = dayStr.toLowerCase().trim();

        if (lowerDay === 'daily') return true;

        // Check for day ranges (e.g., "mon-fri")
        if (lowerDay.includes('-')) {
          const [start, end] = lowerDay.split('-').map(d => d.trim());
          const startDay = dayMap[start];
          const endDay = dayMap[end];

          if (startDay !== undefined && endDay !== undefined) {
            if (startDay <= endDay) {
              return currentDay >= startDay && currentDay <= endDay;
            } else {
              // Wraps around week (e.g., Sat-Mon)
              return currentDay >= startDay || currentDay <= endDay;
            }
          }
        }

        // Single day
        const day = dayMap[lowerDay];
        return day !== undefined && day === currentDay;
      };

      // Split by comma to get different day ranges
      const segments = hoursString.split(',').map(s => s.trim());

      for (const segment of segments) {
        // Try to extract day range and hours
        const timeMatch = segment.match(/(.+?)\s+(\d+(?::\d+)?\s*(?:am|pm))\s*-\s*(\d+(?::\d+)?\s*(?:am|pm))/i);

        if (timeMatch) {
          const dayPart = timeMatch[1];
          const openTime = parseTime(timeMatch[2]);
          const closeTime = parseTime(timeMatch[3]);

          if (isDayInRange(dayPart)) {
            const isOpen = currentTimeMinutes >= openTime && currentTimeMinutes < closeTime;
            const minutesUntilClose = closeTime - currentTimeMinutes;
            const minutesUntilOpen = openTime - currentTimeMinutes;

            // Closing soon (within 60 minutes)
            if (isOpen && minutesUntilClose <= 60 && minutesUntilClose > 0) {
              const hours = Math.floor(minutesUntilClose / 60);
              const mins = minutesUntilClose % 60;
              const timeStr = hours > 0
                ? `${hours}h ${mins}m`
                : `${mins}m`;

              return {
                isOpen: true,
                message: `Closes in ${timeStr}`,
                isClosingSoon: true,
                isOpeningSoon: false,
              };
            }

            // Opening soon (within 60 minutes)
            if (!isOpen && minutesUntilOpen > 0 && minutesUntilOpen <= 60) {
              const hours = Math.floor(minutesUntilOpen / 60);
              const mins = minutesUntilOpen % 60;
              const timeStr = hours > 0
                ? `${hours}h ${mins}m`
                : `${mins}m`;

              return {
                isOpen: false,
                message: `Opens in ${timeStr}`,
                isClosingSoon: false,
                isOpeningSoon: true,
              };
            }

            // Just open or closed
            return {
              isOpen,
              message: isOpen ? 'Open now' : 'Closed',
              isClosingSoon: false,
              isOpeningSoon: false,
            };
          }
        }
      }

      // If we couldn't parse, assume open
      return {
        isOpen: true,
        message: null,
        isClosingSoon: false,
        isOpeningSoon: false,
      };

    } catch (error) {
      console.error('Error parsing hours:', error);
      return {
        isOpen: true,
        message: null,
        isClosingSoon: false,
        isOpeningSoon: false,
      };
    }
  }, [hoursString]);
};
