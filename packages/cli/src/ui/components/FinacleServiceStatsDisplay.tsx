/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type React from 'react';
import { Box, Text } from 'ink';
import { theme } from '../semantic-colors.js';

const METRIC_COL_WIDTH = 20;
const MODEL_COL_WIDTH = 12;

interface StatRowProps {
  title: string;
  values: Array<string | number | React.ReactElement>;
  isSubtle?: boolean;
  isSection?: boolean;
}

const StatRow: React.FC<StatRowProps> = ({
  title,
  values,
  isSubtle = false,
  isSection = false,
}) => (
  <Box>
    <Box width={METRIC_COL_WIDTH}>
      <Text
        bold={isSection}
        color={isSection ? theme.text.primary : theme.text.link}
      >
        {isSubtle ? `  ↳ ${title}` : title}
      </Text>
    </Box>
    {values.map((value, index) => (
      <Box width={MODEL_COL_WIDTH} key={index}>
        <Text color={theme.text.primary}>{value}</Text>
      </Box>
    ))}
  </Box>
);

export const FinacleServiceStatsDisplay: React.FC = () => {
	const serviveHeader = ["Status", "M-Maria", "R-Maria", "C-Maria", "M-Lisrvr", "R-Lisrvr", "C-Lisrvr"];
	const serviseStat = [
  "Finlistval",
  "Coresession",
  "Genlimo",
  "TGAM",
  "Cbc_upi",
  "Uni_upi",
] as const;

const sdata: Record<
  (typeof serviseStat)[number],
  (number | React.ReactElement)[]
> = {
  Finlistval: [
    <Text color={theme.status.success}>✓ </Text>,
    2, 1, 38, 200, 180, 401
  ],
  Coresession: [
    <Text color={theme.status.success}>✓ </Text>,
    2, 1, 38, 200, 180, 401
  ],
  Genlimo: [
    <Text color={theme.status.error}>x </Text>,
    2, 1, 38, 200, 180, 401
  ],
  TGAM: [
    <Text color={theme.status.success}>✓ </Text>,
    2, 1, 38, 200, 180, 401
  ],
  Cbc_upi: [
    <Text color={theme.status.success}>✓ </Text>,
    2, 1, 38, 200, 180, 401
  ],
  Uni_upi: [
    <Text color={theme.status.success}>✓ </Text>,
    2, 1, 38, 200, 180, 401
  ],
};

  return (
    <Box
      borderStyle="round"
      borderColor={theme.border.default}
      flexDirection="column"
      paddingY={1}
      paddingX={2}
    >
   	<Box backgroundColor="gray">
       		<Text bold color={theme.text.accent}>Finacle Backend Service Stats</Text>
	</Box>	
      <Text bold color={theme.text.accent}>
        Finacle Backend Service Stats 
      </Text>
      <Box height={1} />

      {/* Header */}
      <Box>
        <Box width={METRIC_COL_WIDTH}>
          <Text bold color={theme.text.primary}>
            Finacle Service  
          </Text>
        </Box>
        {serviveHeader.map((name) => (
          <Box width={MODEL_COL_WIDTH} key={name}>
            <Text bold color={theme.text.primary}>
              {name}
            </Text>
          </Box>
        ))}
      </Box>

      {/* Divider */}
      <Box
        borderStyle="single"
        borderBottom={true}
        borderTop={false}
        borderLeft={false}
        borderRight={false}
        borderColor={theme.border.default}
      />

      {/* API Section */}
      {serviseStat.map((sn) => (
	<StatRow title={sn} values={sdata[sn]} isSection /> 
      ))}
      <StatRow title="API" values={[]} isSection />
      <Box height={1} />

    </Box>
  );
};
