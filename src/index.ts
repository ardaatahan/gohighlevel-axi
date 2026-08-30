import { dispatch, type Registry } from "./cli/router.js";
import { homeCommand, rootHelp } from "./commands/home.js";
import { contactsCommand } from "./commands/contacts.js";
import {
  contactAddCommand,
  contactGetCommand,
  contactRmCommand,
  contactUpdateCommand,
} from "./commands/contact.js";
import { conversationsCommand } from "./commands/conversations.js";
import { conversationCommand } from "./commands/conversation.js";
import { messageSendCommand } from "./commands/message.js";
import { calendarsList } from "./commands/calendars.js";
import { calendarGet } from "./commands/calendar.js";
import { appointmentsList } from "./commands/appointments.js";
import { appointmentBook, appointmentCancel, appointmentGet } from "./commands/appointment.js";
import { pipelineCommand, pipelinesCommand } from "./commands/pipelines.js";
import { opportunitiesCommand } from "./commands/opportunities.js";
import { opportunityGetCommand, opportunityMoveCommand } from "./commands/opportunity.js";
import { paymentsCommand } from "./commands/payments.js";
import { subscriptionsCommand } from "./commands/subscriptions.js";
import { paymentGetCommand, paymentRecordCommand } from "./commands/payment.js";
import { workflowsCommand } from "./commands/workflows.js";
import { workflowTriggerCommand } from "./commands/workflow.js";
import { webhooksAdd, webhooksList, webhooksRm } from "./commands/webhooks.js";

const registry: Registry = {
  tool: "gohighlevel-axi",
  root: homeCommand,
  rootHelp,
  commands: {
    contacts: contactsCommand,
    contact: contactGetCommand,
    "contact add": contactAddCommand,
    "contact rm": contactRmCommand,
    "contact update": contactUpdateCommand,

    conversations: conversationsCommand,
    conversation: conversationCommand,
    "message send": messageSendCommand,

    calendars: calendarsList,
    calendar: calendarGet,
    appointments: appointmentsList,
    appointment: appointmentGet,
    "appointment book": appointmentBook,
    "appointment cancel": appointmentCancel,

    pipelines: pipelinesCommand,
    pipeline: pipelineCommand,
    opportunities: opportunitiesCommand,
    opportunity: opportunityGetCommand,
    "opportunity move": opportunityMoveCommand,

    payments: paymentsCommand,
    subscriptions: subscriptionsCommand,
    payment: paymentGetCommand,
    "payment record": paymentRecordCommand,

    workflows: workflowsCommand,
    "workflow trigger": workflowTriggerCommand,

    webhooks: webhooksList,
    "webhooks add": webhooksAdd,
    "webhooks rm": webhooksRm,
  },
  aliases: {},
};

const code = await dispatch(registry, process.argv.slice(2));
process.exit(code);
