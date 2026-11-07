import { useEffect } from 'react';
import { useCar, useCarActions } from '../../../../state/CarStateContext';
import { Button, Page, Row, Section, panelStyles } from './SystemPanel';
import { ValetHidden } from './ValetHidden';

const formatTime = (time: number) =>
  new Date(time).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

export const Notifications = () => {
  const notifications = useCar((state) => state.notifications);
  const { clearNotifications, markNotificationsSeen } = useCarActions();

  // Anything that arrives while the panel is open has been seen too.
  useEffect(() => {
    markNotificationsSeen();
  }, [notifications, markNotificationsSeen]);

  return (
    <Page title="Notifications">
      <ValetHidden what="Notification history">
        <Section>
          {notifications.length === 0 ? (
            <p className={panelStyles.hint}>
              Nothing yet. Messages from the car collect here after they leave the screen.
            </p>
          ) : (
            <>
              <ul className={panelStyles.list}>
                {notifications.map((notification) => (
                  <li key={notification.id} className={panelStyles.listItem}>
                    <Row label={notification.message} hint={formatTime(notification.time)} />
                  </li>
                ))}
              </ul>
              <div>
                <Button onPress={clearNotifications}>Clear all</Button>
              </div>
            </>
          )}
        </Section>
      </ValetHidden>
    </Page>
  );
};
