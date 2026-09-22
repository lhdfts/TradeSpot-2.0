"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const distribution_1 = require("./src/utils/distribution");
const api_1 = require("./src/services/api");
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const attendants = yield (0, api_1.getAttendants)();
            const appointments = yield (0, api_1.getAppointments)();
            const events = yield (0, api_1.getEvents)();
            const dateStr = "26/08/2026"; // from screenshot
            const timeStr = "14:00"; // pick a time
            const appointmentType = "Fechamento"; // from screenshot
            console.log(`Total attendants: ${attendants.length}`);
            const result = (0, distribution_1.findAvailableCloserWithLogs)(dateStr, timeStr, appointmentType, attendants, appointments, { durationMinutes: 60 });
            console.log(`\nResult for ${timeStr}:`, result.attendant ? result.attendant.name : 'null');
            console.log(`Logs:`);
            result.checksLog.forEach((log) => console.log(`- ${log.name}: ${log.reason}`));
        }
        catch (e) {
            console.error(e);
        }
    });
}
run();
