// WebUSB API type declarations
interface USBDevice {
    vendorId: number;
    productId: number;
    manufacturerName?: string;
    productName?: string;
    serialNumber?: string;
    open(): Promise<void>;
    close(): Promise<void>;
    selectConfiguration(configurationValue: number): Promise<void>;
    claimInterface(interfaceNumber: number): Promise<void>;
    releaseInterface(interfaceNumber: number): Promise<void>;
    selectAlternateInterface(interfaceNumber: number, alternateSetting: number): Promise<void>;
    controlTransferIn(setup: USBControlTransferParameters, length: number): Promise<USBInTransferResult>;
    controlTransferOut(setup: USBControlTransferParameters, data?: BufferSource): Promise<USBOutTransferResult>;
    transferIn(endpointNumber: number, length: number): Promise<USBInTransferResult>;
    transferOut(endpointNumber: number, data: BufferSource): Promise<USBOutTransferResult>;
    isochronousTransferIn(endpointNumber: number, packetLengths: number[]): Promise<USBIsochronousInTransferResult>;
    isochronousTransferOut(endpointNumber: number, data: BufferSource, packetLengths: number[]): Promise<USBIsochronousOutTransferResult>;
    reset(): Promise<void>;
}

interface USBControlTransferParameters {
    requestType: USBRequestType;
    recipient: USBRecipient;
    request: number;
    value: number;
    index: number;
}

interface USBInTransferResult {
    data?: DataView;
    status: USBTransferStatus;
}

interface USBOutTransferResult {
    bytesWritten: number;
    status: USBTransferStatus;
}

interface USBIsochronousInTransferResult {
    data?: DataView;
    packets: USBInTransferResult[];
}

interface USBIsochronousOutTransferResult {
    bytesWritten: number;
    packets: USBOutTransferResult[];
}

interface USBDeviceFilter {
    vendorId?: number;
    productId?: number;
    classCode?: number;
    subclassCode?: number;
    protocolCode?: number;
    serialNumber?: string;
}

interface USBDeviceRequestOptions {
    filters: USBDeviceFilter[];
}

interface USB {
    getDevices(): Promise<USBDevice[]>;
    requestDevice(options?: USBDeviceRequestOptions): Promise<USBDevice>;
    addEventListener(type: 'connect' | 'disconnect', listener: (event: USBConnectionEvent) => void): void;
    removeEventListener(type: 'connect' | 'disconnect', listener: (event: USBConnectionEvent) => void): void;
}

interface USBConnectionEvent extends Event {
    device: USBDevice;
}

interface Navigator {
    usb?: USB;
}

declare enum USBRequestType {
    'standard' = 'standard',
    'class' = 'class',
    'vendor' = 'vendor'
}

declare enum USBRecipient {
    'device' = 'device',
    'interface' = 'interface',
    'endpoint' = 'endpoint',
    'other' = 'other'
}

declare enum USBTransferStatus {
    'ok' = 'ok',
    'stall' = 'stall',
    'babble' = 'babble'
}
