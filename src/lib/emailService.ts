import emailjs from '@emailjs/browser';

// EmailJS Configuration
const EMAILJS_SERVICE_ID = 'service_pin3nyo';
const EMAILJS_CLASS_TEMPLATE_ID = 'template_fz3xi9s';
const EMAILJS_NOTES_TEMPLATE_ID = 'template_8paf3tj';
const EMAILJS_PUBLIC_KEY = 'FOFjQF2rkJUy4cG2w';

export const sendClassEmail = async (
  studentEmail: string,
  studentName: string,
  classTitle: string,
  scheduledTime: string,
  meetLink: string
) => {
  if (EMAILJS_SERVICE_ID === 'YOUR_SERVICE_ID') {
    console.log('EmailJS not configured yet. Would have sent Class email to:', studentEmail);
    return;
  }

  try {
    await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_CLASS_TEMPLATE_ID,
      {
        to_email: studentEmail,
        to_name: studentName,
        class_title: classTitle,
        scheduled_time: scheduledTime,
        meet_link: meetLink,
      },
      EMAILJS_PUBLIC_KEY
    );
    console.log('Class email sent successfully');
    alert(`Email successfully sent to ${studentEmail}!`);
  } catch (error: any) {
    console.error('Failed to send class email:', error);
    alert(`Failed to send email to ${studentEmail}. Error: ${error?.text || error?.message || JSON.stringify(error)}`);
  }
};

export const sendNotesEmail = async (
  studentEmail: string,
  studentName: string,
  noteTitle: string,
  fileLink: string
) => {
  if (EMAILJS_SERVICE_ID === 'YOUR_SERVICE_ID') {
    console.log('EmailJS not configured yet. Would have sent Notes email to:', studentEmail);
    return;
  }

  try {
    await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_NOTES_TEMPLATE_ID,
      {
        to_email: studentEmail,
        to_name: studentName,
        note_title: noteTitle,
        file_link: fileLink,
      },
      EMAILJS_PUBLIC_KEY
    );
    console.log('Notes email sent successfully');
    alert(`Notes email successfully sent to ${studentEmail}!`);
  } catch (error: any) {
    console.error('Failed to send notes email:', error);
    alert(`Failed to send notes email to ${studentEmail}. Error: ${error?.text || error?.message || JSON.stringify(error)}`);
  }
};
