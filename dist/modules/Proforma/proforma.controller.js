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
exports.ProformaController = void 0;
const proforma_service_1 = require("./proforma.service");
class ProformaController {
    constructor() {
        this.create = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const proforma = yield this.proformaService.createProforma(req.body);
                res.status(201).json(proforma);
            }
            catch (error) {
                res.status(400).json({ error: error.message });
            }
        });
        this.updateStatus = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                const { status } = req.body;
                const proforma = yield this.proformaService.updateStatus(id, status);
                res.json(proforma);
            }
            catch (error) {
                res.status(400).json({ error: error.message });
            }
        });
        this.getById = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                const proforma = yield this.proformaService.findById(id);
                res.json(proforma);
            }
            catch (error) {
                res.status(404).json({ error: error.message });
            }
        });
        this.getAll = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const proformas = yield this.proformaService.getAllProformas(req.query);
                res.json(proformas);
            }
            catch (error) {
                res.status(400).json({ error: error.message });
            }
        });
        this.proformaService = new proforma_service_1.ProformaService();
    }
}
exports.ProformaController = ProformaController;
